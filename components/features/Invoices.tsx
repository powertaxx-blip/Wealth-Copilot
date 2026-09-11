"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useOrgType } from "@/lib/orgType";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Invoice,
  type InvoiceLineItem,
  INVOICES_STORAGE_KEY,
  INVOICE_DRAFT_STORAGE_KEY,
  blankLineItem,
  blankInvoice,
  calcInvoiceTotals,
  calcDeductibleAmount,
  donationAcknowledgmentText,
} from "@/lib/invoices";

/**
 * New to this build — no equivalent in the original prototype (see
 * MIGRATION.md). Built as a real invoice generator rather than a
 * paid/unpaid tracker: business + client details, dynamic line items,
 * live subtotal/tax/total, a saved list you can reload or delete, and a
 * "Print / Save as PDF" button that hands the whole thing to the
 * browser's own Print dialog. That dialog already offers "Save as PDF"
 * as a destination on every modern browser, so there's no PDF library
 * dependency here — just a dedicated print-only layout (the
 * .invoice-print-area rules in app/globals.css) that's invisible on
 * screen and is the *only* thing visible when printing.
 *
 * Nonprofit Mode (lib/orgType.ts) turns this into a donation-receipt
 * generator (see lib/invoices.ts's file header for the IRS Pub. 1771
 * background): the tax-rate field disappears (donations aren't taxed),
 * each line item's Qty column disappears (a gift isn't a quantity times
 * a unit rate — it's just a described item and an amount), and a
 * goods-or-services block appears so the receipt states, correctly,
 * how much of the gift is actually deductible.
 */

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--line)",
  borderRadius: 6,
  background: "var(--bg)",
  color: "var(--ink)",
  fontSize: 14,
};

export function Invoices() {
  const [orgType] = useOrgType();
  const nonprofit = orgType === "nonprofit";
  const [savedInvoices, setSavedInvoices] = useLocalStorageState<Invoice[]>(INVOICES_STORAGE_KEY, []);
  const [draft, setDraft] = useLocalStorageState<Invoice>(INVOICE_DRAFT_STORAGE_KEY, blankInvoice(1));
  const set = <K extends keyof Invoice>(key: K, value: Invoice[K]) => setDraft((d) => ({ ...d, [key]: value }));

  function updateLineItem<K extends keyof InvoiceLineItem>(id: string, key: K, value: InvoiceLineItem[K]) {
    setDraft((d) => ({ ...d, lineItems: d.lineItems.map((li) => (li.id === id ? { ...li, [key]: value } : li)) }));
  }
  function addLineItem() {
    setDraft((d) => ({ ...d, lineItems: [...d.lineItems, blankLineItem()] }));
  }
  function removeLineItem(id: string) {
    setDraft((d) => (d.lineItems.length <= 1 ? d : { ...d, lineItems: d.lineItems.filter((li) => li.id !== id) }));
  }

  const totals = useMemo(() => calcInvoiceTotals(draft), [draft]);
  const deductible = useMemo(() => calcDeductibleAmount(draft, totals), [draft, totals]);
  const acknowledgment = useMemo(() => donationAcknowledgmentText(draft), [draft]);

  function saveInvoice() {
    setSavedInvoices((list) =>
      list.some((inv) => inv.id === draft.id) ? list.map((inv) => (inv.id === draft.id ? draft : inv)) : [...list, draft]
    );
  }
  function newInvoice() {
    setDraft(blankInvoice(savedInvoices.length + 1));
  }
  function loadInvoice(inv: Invoice) {
    setDraft(inv);
  }
  function deleteInvoice(id: string) {
    setSavedInvoices((list) => list.filter((inv) => inv.id !== id));
  }
  function printInvoice() {
    window.print();
  }

  return (
    <>
      <div className="no-print">
        <Card
          title={nonprofit ? "Donation Receipts" : "Invoices"}
          lede={
            nonprofit
              ? "Build a proper written acknowledgment for a donor's gift — your organization's info, the donor's, what was given, and whether anything was provided in return — watch the deductible amount compute live, save it to your running list, then print or save it as a PDF to send."
              : "Build a real invoice — your business info, your client's, and as many line items as the job needs — watch the totals compute live, save it to your running list, then print or save it as a PDF to send."
          }
        >
          <div className="mentor">
            <div>
              <span className="eyebrow">Mentor&apos;s Note</span>
              {nonprofit ? (
                <>
                  Gladys Knight and the Pips sang about a &quot;midnight train&quot; — don&apos;t let a donor&apos;s
                  gift become one you never acknowledge. A prompt, correct receipt is part of thanking them well,
                  and it&apos;s what lets them actually claim the deduction.
                </>
              ) : (
                <>
                  Gladys Knight and the Pips sang about a &quot;midnight train&quot; — don&apos;t let a sent invoice
                  become one you never hear from again. Log it, date it, and follow up before it goes cold.
                </>
              )}
            </div>
          </div>

          <h3 className="text-lg">{nonprofit ? "From (Your Organization)" : "From (Your Business)"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={nonprofit ? "Organization name" : "Business name"}
              value={draft.businessName}
              onChange={(v) => set("businessName", v)}
              placeholder={nonprofit ? "e.g., Chester County Youth Alliance" : "e.g., Chester Mobile Detailing LLC"}
            />
            <TextField
              label="Address / phone / email"
              value={draft.businessDetails}
              onChange={(v) => set("businessDetails", v)}
              placeholder="e.g., 123 Main St, West Chester, PA — (610) 555-0100"
            />
            {nonprofit && (
              <TextField
                label="EIN (tax ID)"
                value={draft.ein}
                onChange={(v) => set("ein", v)}
                placeholder="e.g., 12-3456789"
              />
            )}
          </div>

          <h3 className="text-lg">{nonprofit ? "Donor Information" : "Bill To (Client)"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={nonprofit ? "Donor name" : "Client name"}
              value={draft.clientName}
              onChange={(v) => set("clientName", v)}
              placeholder={nonprofit ? "e.g., Jordan Alvarez" : "e.g., Jordan Realty Group"}
            />
            <TextField
              label={nonprofit ? "Donor address / email" : "Client address / email"}
              value={draft.clientDetails}
              onChange={(v) => set("clientDetails", v)}
              placeholder="e.g., 456 Oak Ave, Philadelphia, PA"
            />
          </div>

          <h3 className="text-lg">{nonprofit ? "Receipt Details" : "Invoice Details"}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={nonprofit ? "Receipt number" : "Invoice number"}
              value={draft.invoiceNumber}
              onChange={(v) => set("invoiceNumber", v)}
            />
            {!nonprofit && (
              <NumberField label="Tax rate (%)" value={draft.taxRatePct} onChange={(v) => set("taxRatePct", v)} step={0.01} />
            )}
            <TextField
              label={nonprofit ? "Date of gift" : "Invoice date"}
              value={draft.date}
              onChange={(v) => set("date", v)}
              placeholder="e.g., 2026-09-10"
            />
            {!nonprofit && (
              <TextField label="Due date" value={draft.dueDate} onChange={(v) => set("dueDate", v)} placeholder="e.g., 2026-09-24" />
            )}
          </div>

          <h3 className="text-lg">{nonprofit ? "What Was Donated" : "Line Items"}</h3>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                {!nonprofit && <th className="num">Qty</th>}
                <th className="num">{nonprofit ? "Amount" : "Rate"}</th>
                {!nonprofit && <th className="num">Amount</th>}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {draft.lineItems.map((li) => (
                <tr key={li.id}>
                  <td>
                    <input
                      type="text"
                      value={li.description}
                      onChange={(e) => updateLineItem(li.id, "description", e.target.value)}
                      placeholder={nonprofit ? "e.g., Cash gift, or a description of donated goods" : "Service or item"}
                      style={inputStyle}
                    />
                  </td>
                  {!nonprofit && (
                    <td className="num">
                      <input
                        type="number"
                        value={li.qty}
                        min={0}
                        onChange={(e) => updateLineItem(li.id, "qty", Math.max(0, parseFloat(e.target.value) || 0))}
                        style={{ ...inputStyle, width: 70, textAlign: "right" }}
                      />
                    </td>
                  )}
                  <td className="num">
                    <input
                      type="number"
                      value={li.rate}
                      min={0}
                      step={0.01}
                      onChange={(e) => updateLineItem(li.id, "rate", Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{ ...inputStyle, width: 90, textAlign: "right" }}
                    />
                  </td>
                  {!nonprofit && <td className="num">{fmt(li.qty * li.rate)}</td>}
                  <td>
                    <button className="btn ghost" onClick={() => removeLineItem(li.id)} disabled={draft.lineItems.length <= 1}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <button className="btn ghost mt-2" onClick={addLineItem}>
            + Add {nonprofit ? "Donation Item" : "Line Item"}
          </button>

          {nonprofit && (
            <>
              <h3 className="text-lg">Goods or Services Provided?</h3>
              <p className="text-sm" style={{ color: "var(--ink-soft)" }}>
                Did the organization give the donor anything in return — a dinner, an event ticket, a tote bag?
                If so, only the amount above that item&apos;s value is tax-deductible, and the IRS requires the
                receipt to say so.
              </p>
              <div className="flex gap-4 items-center">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={!draft.goodsOrServicesProvided}
                    onChange={() => set("goodsOrServicesProvided", false)}
                  />
                  No — nothing was provided in exchange
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={draft.goodsOrServicesProvided}
                    onChange={() => set("goodsOrServicesProvided", true)}
                  />
                  Yes — something was provided
                </label>
              </div>
              {draft.goodsOrServicesProvided && (
                <div className="grid gap-4 sm:grid-cols-2 mt-2">
                  <TextField
                    label="Description of goods/services provided"
                    value={draft.goodsOrServicesDescription}
                    onChange={(v) => set("goodsOrServicesDescription", v)}
                    placeholder="e.g., Dinner and awards ceremony ticket"
                  />
                  <NumberField
                    label="Good-faith estimated value"
                    value={draft.goodsOrServicesValue}
                    onChange={(v) => set("goodsOrServicesValue", v)}
                    step={0.01}
                  />
                </div>
              )}
              <div className="mentor mt-2">
                <div>
                  <span className="eyebrow">Required Statement</span>
                  {acknowledgment}
                </div>
              </div>
            </>
          )}

          <TextField label="Notes / payment terms" value={draft.notes} onChange={(v) => set("notes", v)} />

          {nonprofit ? (
            <ResultBox
              label="Total gift"
              big={fmt(totals.total)}
              stats={[
                { v: fmt(deductible), k: "Tax-Deductible Amount" },
                ...(draft.goodsOrServicesProvided ? [{ v: fmt(draft.goodsOrServicesValue), k: "Value Received" }] : []),
              ]}
            />
          ) : (
            <ResultBox
              label="Invoice total"
              big={fmt(totals.total)}
              stats={[
                { v: fmt(totals.subtotal), k: "Subtotal" },
                { v: fmt(totals.tax), k: "Tax" },
              ]}
            />
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <button className="btn gold" onClick={saveInvoice}>
              {nonprofit ? "Save Receipt" : "Save Invoice"}
            </button>
            <button className="btn ghost" onClick={printInvoice}>
              Print / Save as PDF
            </button>
            <button className="btn ghost" onClick={newInvoice}>
              {nonprofit ? "Start New Receipt" : "Start New Invoice"}
            </button>
          </div>

          <h3 className="text-lg">{nonprofit ? "Saved Donation Receipts" : "Saved Invoices"}</h3>
          {savedInvoices.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {nonprofit
                ? 'No receipts saved yet — build one above and click "Save Receipt."'
                : 'No invoices saved yet — build one above and click "Save Invoice."'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Number</th>
                  <th>{nonprofit ? "Donor" : "Client"}</th>
                  <th>Date</th>
                  <th className="num">{nonprofit ? "Gift" : "Total"}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {savedInvoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoiceNumber}</td>
                    <td>{inv.clientName || (nonprofit ? "(no donor name)" : "(no client name)")}</td>
                    <td>{inv.date}</td>
                    <td className="num">{fmt(calcInvoiceTotals(inv).total)}</td>
                    <td className="flex gap-2">
                      <button className="btn ghost" onClick={() => loadInvoice(inv)}>
                        Load
                      </button>
                      <button className="btn ghost" onClick={() => deleteInvoice(inv.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {nonprofit
              ? 'Everything here lives only in this browser for now — nothing is emailed automatically yet. The IRS requires a written acknowledgment like this for any single gift of $250 or more (Pub. 1771) — load a saved receipt, then use "Print / Save as PDF" to get a clean copy to send.'
              : 'Everything here lives only in this browser for now — nothing is emailed automatically yet. Load a saved invoice, then use "Print / Save as PDF" to get a clean copy to send.'}
          </p>
        </Card>
      </div>

      {/* Print-only layout — hidden on screen, the only thing visible when
          printing (see app/globals.css). Always reflects whatever invoice
          is currently loaded into the form above. */}
      <div className="invoice-print-area" style={{ padding: 32, color: "#1c1024", fontFamily: "Manrope, sans-serif" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 20 }}>{draft.businessName || (nonprofit ? "Your Organization Name" : "Your Business Name")}</div>
            <div style={{ fontSize: 13, whiteSpace: "pre-line" }}>{draft.businessDetails}</div>
            {nonprofit && draft.ein && <div style={{ fontSize: 13 }}>EIN: {draft.ein}</div>}
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 700, fontSize: 24, letterSpacing: 2 }}>{nonprofit ? "DONATION RECEIPT" : "INVOICE"}</div>
            <div style={{ fontSize: 13 }}>{draft.invoiceNumber}</div>
            <div style={{ fontSize: 13 }}>Date: {draft.date}</div>
            {!nonprofit && draft.dueDate && <div style={{ fontSize: 13 }}>Due: {draft.dueDate}</div>}
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#5b4b63" }}>
            {nonprofit ? "Donor" : "Bill To"}
          </div>
          <div style={{ fontWeight: 700 }}>{draft.clientName || (nonprofit ? "(no donor name)" : "(no client name)")}</div>
          <div style={{ fontSize: 13, whiteSpace: "pre-line" }}>{draft.clientDetails}</div>
        </div>

        <table style={{ width: "100%", marginTop: 24, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #1c1024" }}>
              <th style={{ textAlign: "left", padding: "6px 4px" }}>Description</th>
              {!nonprofit && <th style={{ textAlign: "right", padding: "6px 4px" }}>Qty</th>}
              <th style={{ textAlign: "right", padding: "6px 4px" }}>{nonprofit ? "Amount" : "Rate"}</th>
              {!nonprofit && <th style={{ textAlign: "right", padding: "6px 4px" }}>Amount</th>}
            </tr>
          </thead>
          <tbody>
            {draft.lineItems.map((li) => (
              <tr key={li.id} style={{ borderBottom: "1px solid #ddd" }}>
                <td style={{ padding: "6px 4px" }}>{li.description || "—"}</td>
                {!nonprofit && <td style={{ textAlign: "right", padding: "6px 4px" }}>{li.qty}</td>}
                <td style={{ textAlign: "right", padding: "6px 4px" }}>{fmt(li.rate)}</td>
                {!nonprofit && <td style={{ textAlign: "right", padding: "6px 4px" }}>{fmt(li.qty * li.rate)}</td>}
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, marginLeft: "auto", width: 260 }}>
          {nonprofit ? (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 18, fontWeight: 700 }}>
                <span>Total Gift</span>
                <span>{fmt(totals.total)}</span>
              </div>
              {draft.goodsOrServicesProvided && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                  <span>Value Received</span>
                  <span>{fmt(draft.goodsOrServicesValue)}</span>
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 16,
                  fontWeight: 700,
                  marginTop: 6,
                  borderTop: "2px solid #1c1024",
                  paddingTop: 6,
                }}
              >
                <span>Tax-Deductible Amount</span>
                <span>{fmt(deductible)}</span>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>Subtotal</span>
                <span>{fmt(totals.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span>Tax ({draft.taxRatePct}%)</span>
                <span>{fmt(totals.tax)}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 18,
                  fontWeight: 700,
                  marginTop: 6,
                  borderTop: "2px solid #1c1024",
                  paddingTop: 6,
                }}
              >
                <span>Total Due</span>
                <span>{fmt(totals.total)}</span>
              </div>
            </>
          )}
        </div>

        {nonprofit && (
          <div style={{ marginTop: 24, fontSize: 12, color: "#5b4b63", fontStyle: "italic" }}>{acknowledgment}</div>
        )}

        {draft.notes && (
          <div style={{ marginTop: 24, fontSize: 13, color: "#5b4b63" }}>
            <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: 1 }}>Notes</div>
            {draft.notes}
          </div>
        )}
      </div>
    </>
  );
}
