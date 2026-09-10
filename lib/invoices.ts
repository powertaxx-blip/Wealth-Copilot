/**
 * Invoices — new to this build, with no equivalent in the original
 * single-file prototype (see MIGRATION.md). Built as a real invoice
 * generator rather than a paid/unpaid tracker: fill in business and
 * client details and line items, watch subtotal/tax/total compute live,
 * keep a running saved list, and print or "save as PDF" any one of them
 * straight from the browser's own Print dialog — see the
 * .invoice-print-area rules in app/globals.css and the print button in
 * components/features/Invoices.tsx. No PDF library needed for that.
 */

export type InvoiceLineItem = { id: string; description: string; qty: number; rate: number };

export type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  businessName: string;
  businessDetails: string;
  clientName: string;
  clientDetails: string;
  lineItems: InvoiceLineItem[];
  taxRatePct: number;
  notes: string;
};

/** Saved invoice list. */
export const INVOICES_STORAGE_KEY = "wc.invoices";
/** The invoice currently being edited, persisted separately so an
 * in-progress draft survives a closed tab even before it's saved to the
 * list above. */
export const INVOICE_DRAFT_STORAGE_KEY = "wc.invoices.draft";

export function blankLineItem(): InvoiceLineItem {
  return { id: crypto.randomUUID(), description: "", qty: 1, rate: 0 };
}

export function blankInvoice(nextNumber: number): Invoice {
  return {
    id: crypto.randomUUID(),
    invoiceNumber: `INV-${String(nextNumber).padStart(4, "0")}`,
    date: new Date().toISOString().slice(0, 10),
    dueDate: "",
    businessName: "",
    businessDetails: "",
    clientName: "",
    clientDetails: "",
    lineItems: [blankLineItem()],
    taxRatePct: 0,
    notes: "Thank you for your business.",
  };
}

export type InvoiceTotals = { subtotal: number; tax: number; total: number };

export function calcInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = invoice.lineItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const tax = subtotal * (invoice.taxRatePct / 100);
  return { subtotal, tax, total: subtotal + tax };
}
