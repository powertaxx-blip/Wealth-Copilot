"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { NumberField, SelectField, TextField } from "@/components/ui/Field";
import { ResultBox, StatusPill } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  ANNUAL_GIFT_EXCLUSION_2025,
  bequestLanguage,
  ESTATE_EXCLUSION_2025,
  ESTATE_EXCLUSION_2026,
  estimateEstateExposure,
  type BequestType,
  type MaritalStatusAtDeath,
} from "@/lib/estatePlanning";

/**
 * New panel (see lib/estatePlanning.ts header) — reference content on
 * the fundamentals of wills and estates, same "mostly static content
 * plus one real calculator" shape as the Filing Status Guide, plus one
 * genuinely useful interactive piece: a federal estate tax exposure
 * estimate.
 *
 * Nonprofit Mode swaps the individual estate-planning content for
 * planned-giving content aimed at a nonprofit's own fundraising —
 * bequests are the single most common form of planned gift, and this
 * is where a donor's will and an organization's long-term sustainability
 * actually intersect. Same pattern as every other mode-aware panel:
 * genuinely different content, not a relabeling.
 */

function RefCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card" style={{ boxShadow: "none", borderStyle: "dashed" }}>
      <h4 className="mt-0" style={{ color: "var(--navy)" }}>
        {title}
      </h4>
      {children}
    </div>
  );
}

type EstateState = { estateValue: number; maritalStatus: MaritalStatusAtDeath };
const estateInitial: EstateState = { estateValue: 0, maritalStatus: "single" };

type BequestState = { orgName: string; ein: string; bequestType: BequestType; specificAmount: number; percentage: number };
const bequestInitial: BequestState = { orgName: "", ein: "", bequestType: "percentage", specificAmount: 0, percentage: 10 };

export function WillsEstates() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";

  const [estate, setEstate] = useLocalStorageState<EstateState>("wc.estatePlanning.exposure", estateInitial);
  const setEstateField = <K extends keyof EstateState>(key: K, value: EstateState[K]) =>
    setEstate((s) => ({ ...s, [key]: value }));
  const exposure = useMemo(() => estimateEstateExposure(estate.estateValue, estate.maritalStatus), [estate]);

  const [bequest, setBequest] = useLocalStorageState<BequestState>("wc.estatePlanning.bequest", bequestInitial);
  const setBequestField = <K extends keyof BequestState>(key: K, value: BequestState[K]) =>
    setBequest((s) => ({ ...s, [key]: value }));
  const bequestText = useMemo(() => bequestLanguage(bequest), [bequest]);

  return (
    <Card
      title="Wills & Estates"
      lede={
        nonprofit
          ? "A will is where a donor's lifetime of giving can become their final gift. This covers the fundamentals of planned giving through bequests — the single most common way supporters remember an organization after their lifetime."
          : "A will isn't just for the wealthy — it's the one document that decides who raises your children, who settles your affairs, and who receives what you built, instead of a state law and a probate judge deciding for you."
      }
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              The Bhagavad Gita teaches that none of us keep what we build — it passes on regardless. A bequest is
              simply choosing on purpose where a piece of that legacy goes, instead of leaving it to chance.
            </>
          ) : (
            <>
              The Temptations sang &quot;Papa was a rolling stone... and when he died, all he left us was
              alone&quot; — a will is how you make sure that&apos;s never your family&apos;s story.
            </>
          )}
        </div>
      </div>

      {!nonprofit ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RefCard title="What a Will Actually Does">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Names an executor to settle your affairs, says who gets what, and — if you have minor children —
                names their guardian. Die without one (&quot;intestate&quot;) and your state&apos;s default
                inheritance law decides all of this for you, with no regard for what you actually wanted.
              </p>
            </RefCard>
            <RefCard title="Beyond the Will">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A durable power of attorney (financial decisions if you&apos;re incapacitated) and a healthcare
                proxy / advance directive (medical decisions and end-of-life wishes) matter just as much as the
                will itself — a will only takes effect after death.
              </p>
            </RefCard>
            <RefCard title="The Beneficiary Designation Trap">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Retirement accounts, life insurance, and payable-on-death bank accounts pass directly to whoever is
                named on the account&apos;s beneficiary form — <b>a will cannot override this</b>. An outdated
                form (an ex-spouse still listed, years after divorce) is one of the most common and costly estate
                planning mistakes.
              </p>
            </RefCard>
            <RefCard title="Probate: What It Is">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                The court process that validates a will and supervises distributing the estate. It can be slow,
                costs money in court and attorney fees, and becomes a public record — which is exactly why many
                people pair a will with a living trust (see the Trusts panel) to keep more of the estate out of it.
              </p>
            </RefCard>
          </div>

          <h3 className="text-lg">Federal Estate Tax: Do You Need to Worry?</h3>
          <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
            For 2025, the federal estate/gift tax basic exclusion is <b>{fmt(ESTATE_EXCLUSION_2025)} per person</b>{" "}
            (IRS Form 709 instructions) — a married couple can effectively shelter double that, if the surviving
            spouse&apos;s executor files a timely portability (DSUE) election to claim whatever the first spouse
            didn&apos;t use. The One Big Beautiful Bill Act raises this to {fmt(ESTATE_EXCLUSION_2026)} per person
            starting in 2026, and makes that higher amount permanent instead of letting it fall back down the way
            prior law had scheduled. Most people will never owe federal estate tax — but some states apply their
            own estate or inheritance tax at thresholds far below the federal one, so this federal number alone
            isn&apos;t the whole picture. Lifetime gifts also matter: you can give up to {fmt(ANNUAL_GIFT_EXCLUSION_2025)} per
            recipient, per year, in 2025 without touching your lifetime exclusion at all.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Estimated total estate value"
              value={estate.estateValue}
              onChange={(v) => setEstateField("estateValue", v)}
            />
            <SelectField
              label="Marital status at death"
              value={estate.maritalStatus}
              onChange={(v) => setEstateField("maritalStatus", v as MaritalStatusAtDeath)}
              options={[
                { value: "single", label: "Single" },
                { value: "married", label: "Married (assumes portability is elected)" },
              ]}
            />
          </div>

          <ResultBox
            label="2025 Federal Estate Tax Exposure (Estimate)"
            big={exposure.likelyExposed ? `${fmt(exposure.taxableEstate)} potentially taxable` : "Likely no federal estate tax owed"}
            stats={[
              { v: fmt(exposure.effectiveExclusion), k: "your exclusion" },
              { v: fmt(estate.estateValue), k: "estate value entered" },
            ]}
          />
          {estate.estateValue > 0 && (
            <StatusPill tone={exposure.likelyExposed ? "warning" : "good"}>
              {exposure.likelyExposed
                ? "Above the federal exclusion — this is a conversation for an estate attorney, not a DIY project."
                : "Under the federal exclusion — but check your state's own estate/inheritance tax rules separately."}
            </StatusPill>
          )}

          <div className="note mt-2">
            A deliberately simplified estimate — it doesn&apos;t account for prior lifetime gifts already used
            against your exclusion, trusts, or state-level estate/inheritance tax. It answers one question honestly
            (&quot;is this even something I need to think about?&quot;), not a full estate tax return.
          </div>

          <h3 className="text-lg">When to Update Your Will</h3>
          <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
            Marriage or divorce, a birth or adoption, moving to a new state, a major change in assets, or the death
            of a named executor or guardian — any of these is a reason to pull your will back out and check it
            still says what you actually want.
          </p>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RefCard title="Bequests: The Most Common Planned Gift">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A donor simply names the organization in their will — no lawyer visit required beyond updating (or
                writing) that will. It costs the donor nothing during their lifetime, which is exactly why it&apos;s
                the most common form of planned giving by far.
              </p>
            </RefCard>
            <RefCard title="Three Kinds of Bequests">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                <b>Specific</b> — a fixed dollar amount or named asset. <b>Percentage</b> — a share of the whole
                estate, which automatically scales with its value over time. <b>Residuary</b> — whatever is left
                after all other gifts, debts, and expenses are paid; often the largest and most flexible for the
                donor.
              </p>
            </RefCard>
            <RefCard title="Why Bequests Matter for Sustainability">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A typical bequest is larger than a typical annual gift, often by a wide margin — it's frequently a
                donor's single largest lifetime contribution. Many organizations build a &quot;legacy society&quot;
                specifically to recognize and steward donors who've documented one.
              </p>
            </RefCard>
            <RefCard title="Beneficiary Designation Gifts">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Naming the organization as a beneficiary on a retirement account or life insurance policy is often
                simpler than amending a will — just a form with the account custodian. It can also be more
                tax-efficient: a charity owes no income tax on an inherited retirement account, while an individual
                heir generally would.
              </p>
            </RefCard>
          </div>

          <h3 className="text-lg">Bequest Language Generator</h3>
          <p className="text-sm max-w-[62ch]" style={{ color: "var(--ink-soft)" }}>
            A starting point for a conversation between a donor and their own estate attorney — not a substitute
            for one. Fill in your organization&apos;s details below to see the standard wording take shape.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label="Organization's legal name" value={bequest.orgName} onChange={(v) => setBequestField("orgName", v)} placeholder="e.g., Power Taxx Foundation, Inc." />
            <TextField label="EIN" value={bequest.ein} onChange={(v) => setBequestField("ein", v)} placeholder="e.g., 12-3456789" />
            <SelectField
              label="Bequest type"
              value={bequest.bequestType}
              onChange={(v) => setBequestField("bequestType", v as BequestType)}
              options={[
                { value: "specific", label: "Specific amount" },
                { value: "percentage", label: "Percentage of estate" },
                { value: "residuary", label: "Residuary (what's left over)" },
              ]}
            />
            {bequest.bequestType === "specific" && (
              <NumberField label="Specific dollar amount" value={bequest.specificAmount} onChange={(v) => setBequestField("specificAmount", v)} />
            )}
            {bequest.bequestType === "percentage" && (
              <NumberField
                label="Percentage of estate"
                value={bequest.percentage}
                onChange={(v) => setBequestField("percentage", Math.min(100, v))}
              />
            )}
          </div>

          <div className="result-box">
            <div className="label">Sample Bequest Language</div>
            {/* No inline color override here on purpose — .result-box already
                sets a light (--paper) text color for its dark navy background;
                overriding it to --ink (meant for light card backgrounds) is
                exactly the bug this comment is guarding against: it made this
                text nearly invisible against the dark box. */}
            <p className="mt-2 text-sm">{bequestText}</p>
          </div>
          <div className="note mt-2">
            Always have a donor&apos;s bequest intent reviewed and formally drafted by their own attorney — this
            wording is a starting point, not a legal document.
          </div>
        </>
      )}
    </Card>
  );
}
