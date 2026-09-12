"use client";

import { Card } from "@/components/ui/Card";
import { useOrgType } from "@/lib/orgType";

/**
 * New panel — reference content on trust fundamentals, same "mostly
 * static content" shape as FAQ: which trust type solves which problem
 * is a qualitative decision (made with an estate attorney, based on
 * family and asset specifics), not a formula, so unlike Wills & Estates
 * this panel doesn't force a calculator in where a comparison table
 * actually serves the reader better.
 *
 * Nonprofit Mode swaps individual trust fundamentals for the two
 * charitable trust structures a planned-giving program actually
 * encounters — Charitable Remainder Trusts and Charitable Lead Trusts —
 * the trust-based counterpart to Wills & Estates' bequest content.
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

export function Trusts() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";

  return (
    <Card
      title="Trusts"
      lede={
        nonprofit
          ? "Some of the largest gifts a nonprofit ever receives come through a trust, not a checkbook — structures that let a donor give appreciated assets, keep an income stream, and still leave a major gift behind."
          : "A trust isn't just an estate-planning tool for the wealthy — it's a legal container that can skip probate entirely, plan for incapacity, and (done right) protect assets in ways a will alone never can."
      }
    >
      <div className="mentor">
        <div>
          <span className="eyebrow">Mentor&apos;s Note</span>
          {nonprofit ? (
            <>
              The Puranas describe dana (giving) as most powerful when it costs the giver something real — a
              charitable trust is exactly that: a donor gives up outright ownership today so the gift is certain
              tomorrow.
            </>
          ) : (
            <>
              Gladys Knight & the Pips sang &quot;I&apos;ve got to use my imagination&quot; — a trust is imagination
              applied to your estate: naming exactly how and when your assets reach the people you actually intend,
              instead of handing that decision to a probate court.
            </>
          )}
        </div>
      </div>

      {!nonprofit ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RefCard title="What a Trust Actually Is">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A legal arrangement where a <b>grantor</b> transfers assets to a <b>trustee</b>, who manages and
                distributes them to named <b>beneficiaries</b> according to written terms the grantor sets down —
                terms that can be as simple or as specific as the grantor wants.
              </p>
            </RefCard>
            <RefCard title="Revocable (Living) Trust">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                The grantor can change or cancel it at any time, and typically remains their own trustee while
                alive. It avoids probate on anything actually titled into it and plans for incapacity — but the
                assets still count as part of the grantor&apos;s taxable estate, since they never really gave up
                control.
              </p>
            </RefCard>
            <RefCard title="Irrevocable Trust">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                The grantor gives up control (and usually can&apos;t undo it). In exchange, assets properly
                transferred in can be removed from the taxable estate and gain real creditor protection — the
                trade-off that makes this a genuine tax and asset-protection tool, not just a probate shortcut.
              </p>
            </RefCard>
            <RefCard title="The #1 Living-Trust Mistake">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Signing the trust document isn&apos;t enough — assets have to be actually <b>retitled</b> into the
                trust&apos;s name (a new deed, a changed account registration). An &quot;unfunded&quot; trust
                controls nothing; anything left outside it still goes through probate regardless of what the trust
                document says.
              </p>
            </RefCard>
          </div>

          <h3 className="text-lg">Common Special-Purpose Trusts</h3>
          <table>
            <thead>
              <tr>
                <th>Trust Type</th>
                <th>What It's For</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Revocable Living Trust</td>
                <td>Probate avoidance and incapacity planning; no tax benefit by itself</td>
              </tr>
              <tr>
                <td>Irrevocable Life Insurance Trust (ILIT)</td>
                <td>Keeps life insurance proceeds out of the taxable estate</td>
              </tr>
              <tr>
                <td>Special Needs Trust</td>
                <td>Provides for a disabled beneficiary without disqualifying them from means-tested government benefits</td>
              </tr>
              <tr>
                <td>Testamentary Trust</td>
                <td>Created by a will; only comes into existence at death — often used to hold a minor's inheritance until a set age</td>
              </tr>
            </tbody>
          </table>

          <div className="note mt-2">
            Trusts and wills aren&apos;t either/or. Most people with a living trust still sign a simple
            &quot;pour-over&quot; will alongside it, to catch anything that never got retitled into the trust
            before death.
          </div>
        </>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <RefCard title="Charitable Remainder Trust (CRT)">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A donor irrevocably contributes assets — often appreciated stock or real estate — to a trust that
                pays income back to the donor (or another named beneficiary) for life or a set term. Whatever
                remains at the end goes to the organization. The donor gets a partial income-tax deduction
                immediately and avoids paying capital gains tax on the appreciated asset when it goes into the
                trust.
              </p>
            </RefCard>
            <RefCard title="Charitable Lead Trust (CLT)">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                The mirror image of a CRT: the organization receives an income stream first, for a set term of
                years, and whatever remains afterward passes to the donor's heirs. Often used specifically to
                transfer wealth to family with reduced gift or estate tax.
              </p>
            </RefCard>
            <RefCard title="Why Donors Use These Instead of a Simple Gift">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                A donor holding highly appreciated, low-basis stock or property can face a large capital gains bill
                selling it outright. Routing it through a CRT instead avoids that immediate tax, replaces the asset
                with an income stream, and still leaves a substantial gift behind — a combination a simple
                donation or bequest can't offer on its own.
              </p>
            </RefCard>
            <RefCard title="Your Organization's Actual Role">
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Most nonprofits don&apos;t administer these trusts themselves — a bank or trust company usually
                serves as trustee. The organization&apos;s real job is awareness, referring interested donors to
                their own estate attorney and financial advisor, and stewarding the relationship until the
                eventual remainder gift arrives.
              </p>
            </RefCard>
          </div>

          <div className="note mt-2">
            A donor-advised fund is a simpler, more common alternative some donors use instead of — or alongside —
            a charitable trust: they get an immediate deduction and recommend grants over time, without the legal
            cost of setting up a standalone trust. It's worth knowing about even though it isn't a trust itself.
          </div>
        </>
      )}
    </Card>
  );
}
