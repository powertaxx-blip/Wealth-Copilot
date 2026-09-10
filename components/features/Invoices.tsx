"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { TextField, NumberField } from "@/components/ui/Field";
import { ResultBox } from "@/components/ui/ResultBox";
import { fmt } from "@/lib/format";
import { useLocalStorageState } from "@/lib/useLocalStorageState";
import {
  type Invoice,
  type InvoiceLineItem,
  INVOICES_STORAGE_KEY,
  INVOICE_DRAFT_STORAGE_KEY,
  blankLineItem,
  blankInvoice,
  calcInvoiceTotals,
} from "@/lib/invoices";

/**
 * New to this build — no equivalent in the original prototype (see
 * MIGRATION.md), and built as a real invoice generator rather than a
 * paid/unpaid tracker per the priority decision: business + client
 * details, dynamic line items, live subtotal/tax/total, a saved list you
 * can reload or delete, and a "Print / Save as PDF" button that hands the
 * whole thing to the browser's own Print dialog. That dialog already
 * offers "Save as PDF" as a destination on every modern browser, so
 * there's no PDF library dependency here — just a dedicated print-only
 * layout (the .invoice-print-area rules in app/globals.css) that's
 * invisible on screen and is the *only* thing visible when printing.
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
          title="Invoices"
          lede="Build a real invoice — your business info, your client's, and as many line items as the job needs — watch the totals compute live, save it to your running list, then print or save it as a PDF to send."
        >
          <div className="mentor">
            <div>
              <span className="eyebrow">Mentor&apos;s Note</span>
              Gladys Knight and the Pips sang about a &quot;midnight train&quot; — don&apos;t let a sent invoice
              become one you never hear from again. Log it, date it, and follow up before it goes cold.
            </div>
          </div>

          <h3 className="text-lg">From (Your Business)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Business name"
              value={draft.businessName}
              onChange={(v) => set("businessName", v)}
              placeholder="e.g., Chester Mobile Detailing LLC"
            />
            <TextField
              label="Address / phone / email"
              value={draft.businessDetails}
              onChange={(v) => set("businessDetails", v)}
              placeholder="e.g., 123 Main St, West Chester, PA — (610) 555-0100"
            />
          </div>

          <h3 className="text-lg">Bill To (Client)</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label="Client name"
              value={draft.clientName}
              onChange={(v) => set("clientName", v)}
              placeholder="e.g., Jordan Realty Group"
            />
            <TextField
              label="Client address / email"
              value={draft.clientDetails}
              onChange={(v) => set("clientDetails", v)}
              placeholder="e.g., 456 Oak Ave, Philadelphia, PA"
            />
          </div>
