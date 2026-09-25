"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { MentorNote } from "@/components/ui/MentorNote";
import { TextField, SelectField, TextAreaField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import { type Grant, grantsSortedByDeadline } from "@/lib/grants";
import {
  type GrantWritingState,
  type OrgProfile,
  type ProposalSectionKey,
  type ProposalSections,
  GRANT_WRITING_STORAGE_KEY,
  DEFAULT_GRANT_WRITING_STATE,
  BLANK_ORG_PROFILE,
  PROPOSAL_SECTIONS,
  TAX_EXEMPT_OPTIONS,
  proposalFor,
  orgProfileToText,
  isOrgProfileStarted,
  isOrgProfileComplete,
  countFilledSections,
  wordCount,
} from "@/lib/grantWriting";

/**
 * Grant Writing Tool — the second half of the Grants page, under Grant
 * Tracking (rendered from Grants.tsx, which passes its own `grants` list
 * down so a grant added above shows up here immediately — a second
 * useLocalStorageState on the same key would hold its own stale copy).
 * See lib/grantWriting.ts for the storage shape and lib/ai/draftGrantSection.ts
 * for the AI side.
 *
 * Two parts: a structured template (seven standard proposal sections per
 * grant, plus an Organization Profile filled out once and pulled into any
 * grant's Organization Background), and a per-section "Draft with AI"
 * button built on the same AI infrastructure as the Tax Estimator and
 * Schedule C insight panels. An AI draft is never written into a section
 * automatically — the user reviews it and chooses to use it.
 */

const PROFILE_FIELD_COUNT = 5;

type DraftState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; draft: string; suggestions: string[] };

function DraftDisclaimer() {
  return (
    <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
      <b>This is a starting draft, not a finished proposal.</b> Review every sentence, fill in any [ADD: …]
      placeholders, and personalize it before submitting it to a funder.
    </p>
  );
}

function SectionEditor({
  sectionKey,
  label,
  help,
  placeholder,
  value,
  onChange,
  grant,
  orgProfile,
  sections,
}: {
  sectionKey: ProposalSectionKey;
  label: string;
  help: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  grant: Grant;
  orgProfile: OrgProfile;
  sections: ProposalSections;
}) {
  const [draftState, setDraftState] = useState<DraftState>({ status: "idle" });
  const [notice, setNotice] = useState<string | null>(null);
  const isBackground = sectionKey === "orgBackground";

  function insertProfile() {
    const text = orgProfileToText(orgProfile);
    if (!isOrgProfileStarted(orgProfile)) {
      setNotice("Fill in the Organization Profile above first — then it can be pulled in here.");
      return;
    }
    if (value.includes(text)) {
      setNotice("Your Organization Profile is already in this section.");
      return;
    }
    setNotice(null);
    onChange(value.trim() ? `${value.trimEnd()}\n\n${text}` : text);
  }

  async function draftWithAI() {
    setNotice(null);
    const hasAnything = isOrgProfileStarted(orgProfile) || Object.values(sections).some((s) => s.trim());
    if (!hasAnything) {
      setDraftState({
        status: "error",
        message:
          "There's nothing to draft from yet. Fill in your Organization Profile, or jot a few notes in this section — the AI only uses what you've entered.",
      });
      return;
    }
    setDraftState({ status: "loading" });
    try {
      const res = await fetch("/api/grants/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          section: sectionKey,
          grant: {
            grantName: grant.grantName,
            funderName: grant.funderName,
            amountRequested: grant.amountRequested,
            applicationDeadline: grant.applicationDeadline,
          },
          orgProfile,
          sections,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body || typeof body.draft !== "string") {
        setDraftState({
          status: "error",
          message:
            (body && typeof body.error === "string" && body.error) ||
            "AI drafting is temporarily unavailable — everything you've written is still saved.",
        });
        return;
      }
      setDraftState({
        status: "success",
        draft: body.draft,
        suggestions: Array.isArray(body.suggestions) ? body.suggestions : [],
      });
    } catch {
      setDraftState({ status: "error", message: "Couldn't reach the AI drafting service — everything you've written is still saved." });
    }
  }

  function applyDraft(mode: "replace" | "append") {
    if (draftState.status !== "success") return;
    onChange(mode === "append" && value.trim() ? `${value.trimEnd()}\n\n${draftState.draft}` : draftState.draft);
    setDraftState({ status: "idle" });
  }

  const words = wordCount(value);

  return (
    <div className="flex flex-col gap-2" style={{ borderTop: "1px solid var(--line)", paddingTop: "14px" }}>
      <TextAreaField label={label} tip={help} value={value} onChange={onChange} placeholder={placeholder} rows={6} />
      <div className="flex flex-wrap items-center gap-2" style={{ display: "flex" }}>
        <button
          type="button"
          className="btn"
          onClick={draftWithAI}
          disabled={draftState.status === "loading"}
          style={{
            // Same fixed --brand-surface/--gold pairing as the AI insight
            // panels' buttons, so every AI action in the app looks alike.
            background: "var(--brand-surface)",
            color: "var(--gold)",
            opacity: draftState.status === "loading" ? 0.6 : 1,
          }}
        >
          {draftState.status === "loading" ? "Drafting…" : "✨ Draft with AI"}
        </button>
        {isBackground && (
          <button type="button" className="btn ghost" onClick={insertProfile}>
            Insert Organization Profile
          </button>
        )}
        <span className="text-xs" style={{ color: "var(--muted)", marginLeft: "auto" }}>
          {words} word{words === 1 ? "" : "s"}
        </span>
      </div>

      {notice && (
        <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
          {notice}
        </p>
      )}

      {draftState.status === "error" && (
        <div className="note" style={{ borderLeftColor: "var(--status-warning)", margin: 0 }}>
          <b>Heads up:</b> {draftState.message}
        </div>
      )}

      {draftState.status === "success" && (
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--gold)", background: "var(--line-soft)" }}>
          <span className="eyebrow">AI Draft — {label}</span>
          <div className="text-sm mt-1" style={{ whiteSpace: "pre-wrap" }}>
            {draftState.draft}
          </div>
          {draftState.suggestions.length > 0 && (
            <>
              <p className="text-sm mt-3 font-semibold" style={{ color: "var(--navy)" }}>
                To make this section stronger, add:
              </p>
              <ul className="mt-1 text-sm" style={{ paddingLeft: "1.1em", listStyle: "disc" }}>
                {draftState.suggestions.map((s, i) => (
                  <li key={i} style={{ marginBottom: "4px" }}>
                    {s}
                  </li>
                ))}
              </ul>
            </>
          )}
          <DraftDisclaimer />
          <div className="flex flex-wrap gap-2 mt-3" style={{ display: "flex" }}>
            {value.trim() ? (
              <>
                <button type="button" className="btn gold" onClick={() => applyDraft("replace")}>
                  Replace my text with this draft
                </button>
                <button type="button" className="btn ghost" onClick={() => applyDraft("append")}>
                  Add below my text
                </button>
              </>
            ) : (
              <button type="button" className="btn gold" onClick={() => applyDraft("replace")}>
                Use this draft
              </button>
            )}
            <button type="button" className="btn ghost" onClick={() => setDraftState({ status: "idle" })}>
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function GrantWritingTool({ grants }: { grants: Grant[] }) {
  const [state, setState] = useLocalStorageState<GrantWritingState>(GRANT_WRITING_STORAGE_KEY, DEFAULT_GRANT_WRITING_STATE);
  const orgProfile: OrgProfile = { ...BLANK_ORG_PROFILE, ...state.orgProfile };

  const sortedGrants = useMemo(() => grantsSortedByDeadline(grants), [grants]);
  const [selectedId, setSelectedId] = useState<string>("");
  // Keep the selection pointing at a grant that still exists — the first
  // (soonest-deadline) one by default, or after the selected grant is
  // removed in Grant Tracking above.
  useEffect(() => {
    if (!sortedGrants.some((g) => g.id === selectedId)) {
      setSelectedId(sortedGrants[0]?.id ?? "");
    }
  }, [sortedGrants, selectedId]);

  const grant = sortedGrants.find((g) => g.id === selectedId);
  const proposal = grant ? proposalFor(state, grant.id) : null;

  function updateProfile(patch: Partial<OrgProfile>) {
    setState((s) => ({ ...s, orgProfile: { ...BLANK_ORG_PROFILE, ...s.orgProfile, ...patch } }));
  }

  function updateSection(grantId: string, key: ProposalSectionKey, v: string) {
    setState((s) => ({ ...s, proposals: { ...s.proposals, [grantId]: { ...proposalFor(s, grantId), [key]: v } } }));
  }

  const profileFilled = [
    orgProfile.orgName,
    orgProfile.mission,
    orgProfile.foundingYear,
    orgProfile.taxExemptStatus,
    orgProfile.keyAchievements,
  ].filter((v) => v.trim()).length;
  const filledSections = proposal ? countFilledSections(proposal) : 0;
  const totalWords = proposal ? PROPOSAL_SECTIONS.reduce((n, s) => n + wordCount(proposal[s.key]), 0) : 0;

  return (
    <div id="grant-writing" style={{ scrollMarginTop: "80px" }}>
      <Card
        title="Grant Writing Tool"
        lede="Write each grant's proposal one standard section at a time — with your organization's details filled out once and reused everywhere, and an AI first draft for any section when you're staring at a blank page."
      >
        <MentorNote>
          &ldquo;Omit needless words&rdquo; is the most famous line in Strunk and White&apos;s <i>The Elements of Style</i>,
          and it&apos;s especially good advice for a grant proposal: a funder is reading quickly, often alongside dozens
          of others. The
          clearer and plainer each section says what you&apos;ll do and why it matters, the easier you make it for
          someone to say yes.
        </MentorNote>

        <h3 className="text-lg">Organization Profile</h3>
        <p className="text-sm" style={{ color: "var(--ink-soft)", marginTop: "-8px" }}>
          Fill this out once. Every proposal can pull it into its Organization Background, and the AI uses it when
          drafting any section. {profileFilled} of {PROFILE_FIELD_COUNT} filled
          {isOrgProfileComplete(orgProfile) ? " ✓" : ""}.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Organization name"
            value={orgProfile.orgName}
            onChange={(v) => updateProfile({ orgName: v })}
            placeholder="e.g., Brandywine Youth Arts"
          />
          <TextField
            label="Founding year"
            value={orgProfile.foundingYear}
            onChange={(v) => updateProfile({ foundingYear: v })}
            placeholder="e.g., 2014"
          />
          <SelectField
            label="Tax-exempt status"
            value={orgProfile.taxExemptStatus}
            onChange={(v) => updateProfile({ taxExemptStatus: v as OrgProfile["taxExemptStatus"] })}
            options={TAX_EXEMPT_OPTIONS}
          />
        </div>
        <TextAreaField
          label="Mission statement"
          value={orgProfile.mission}
          onChange={(v) => updateProfile({ mission: v })}
          placeholder="One or two sentences on why your organization exists and who it serves."
          rows={3}
        />
        <TextAreaField
          label="Key achievements"
          value={orgProfile.keyAchievements}
          onChange={(v) => updateProfile({ keyAchievements: v })}
          placeholder="Milestones, results, and recognition — with real numbers where you have them (people served, programs run, awards)."
          rows={4}
          tip="Specific, true numbers here are what let an AI draft cite results instead of leaving placeholders — it will never make numbers up."
        />

        <h3 className="text-lg">Write a Proposal</h3>
        {sortedGrants.length === 0 || !grant || !proposal ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Add a grant in Grant Tracking above first — each proposal belongs to one grant, so its funder, amount and
            deadline come along automatically.
          </p>
        ) : (
          <>
            <SelectField
              label="Proposal for"
              value={grant.id}
              onChange={setSelectedId}
              options={sortedGrants.map((g) => ({
                value: g.id,
                label: g.funderName ? `${g.grantName} — ${g.funderName}` : g.grantName,
              }))}
            />
            <p className="text-sm" style={{ color: "var(--ink-soft)", marginTop: "-8px" }}>
              Funder: <b>{grant.funderName || "not entered"}</b> · Requesting:{" "}
              <b>{grant.amountRequested > 0 ? fmt(grant.amountRequested) : "not entered"}</b> · Deadline:{" "}
              <b>{grant.applicationDeadline || "not entered"}</b>
            </p>

            <div className="note" style={{ margin: 0 }}>
              <b>About &ldquo;Draft with AI&rdquo;:</b> drafts are built only from what you&apos;ve entered on this page —
              the grant above, your Organization Profile, and your other sections. They never invent numbers or facts; where
              something is missing you&apos;ll see an [ADD: …] placeholder instead. Every draft is a starting point to review
              and personalize before you submit anything.
            </div>

            {PROPOSAL_SECTIONS.map((s) => (
              <SectionEditor
                // grant.id in the key resets any open AI draft when switching grants
                key={`${grant.id}:${s.key}`}
                sectionKey={s.key}
                label={s.label}
                help={s.help}
                placeholder={s.placeholder}
                value={proposal[s.key]}
                onChange={(v) => updateSection(grant.id, s.key, v)}
                grant={grant}
                orgProfile={orgProfile}
                sections={proposal}
              />
            ))}

            <ResultBox
              label={`Proposal progress — ${grant.grantName}`}
              big={`${filledSections} of ${PROPOSAL_SECTIONS.length} sections written`}
              stats={[
                { v: totalWords.toLocaleString(), k: "Total words" },
                { v: `${profileFilled} / ${PROFILE_FIELD_COUNT}`, k: "Org profile fields" },
                { v: grant.applicationDeadline || "—", k: "Deadline" },
              ]}
            />
          </>
        )}

        <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
          Proposal text lives only in this browser, like the rest of this page. Clicking &ldquo;Draft with AI&rdquo; sends
          this grant&apos;s details, your Organization Profile, and this proposal&apos;s sections to our AI provider to
          generate the draft — don&apos;t put anything in these fields you wouldn&apos;t want shared that way.
        </p>
      </Card>
    </div>
  );
}
