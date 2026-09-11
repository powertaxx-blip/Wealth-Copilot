/**
 * Invoices — new to this build, with no equivalent in the original
 * single-file prototype (see MIGRATION.md). Built as a real invoice
 * generator rather than a paid/unpaid tracker: fill in business and
 * client details and line items, watch subtotal/tax/total compute live,
 * keep a running saved list, and print or "save as PDF" any one of them
 * straight from the browser's own Print dialog — see the
 * .invoice-print-area rules in app/globals.css and the print button in
 * components/features/Invoices.tsx. No PDF library needed for that.
 *
 * Nonprofit Mode (lib/orgType.ts) turns this into a donation-receipt
 * generator instead of an invoice — a 501(c)(3) doesn't bill donors, it
 * acknowledges their gift, and the IRS actually requires a specific kind
 * of acknowledgment (Pub. 1771) for any single contribution of $250 or
 * more: the amount/description of what was given, and a statement of
 * whether the organization provided anything back in exchange (and if
 * so, its good-faith value, since only the excess is tax-deductible).
 * The four `goodsOrServices*`/`ein` fields exist for that — always
 * present on every Invoice, same as BalanceSheet.tsx keeps both field
 * sets at once, so nothing is lost switching modes back and forth.
 */

import { fmt } from "@/lib/format";

export type InvoiceLineItem = { id: string; description: string; qty: number; rate: number };

export type Invoice = {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  businessName: string;
  businessDetails: string;
  /** Nonprofit's EIN, shown on donation receipts so a donor can verify
   * 501(c)(3) status when claiming the deduction. */
  ein: string;
  clientName: string;
  clientDetails: string;
  lineItems: InvoiceLineItem[];
  taxRatePct: number;
  notes: string;
  /** Did the organization provide any goods/services in exchange for
   * this contribution (a dinner, a tote bag, an event ticket)? */
  goodsOrServicesProvided: boolean;
  goodsOrServicesDescription: string;
  /** Good-faith estimate of what was provided, per IRS Pub. 1771 — the
   * donor's deductible amount is the total gift minus this value. */
  goodsOrServicesValue: number;
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
    ein: "",
    clientName: "",
    clientDetails: "",
    lineItems: [blankLineItem()],
    taxRatePct: 0,
    notes: "Thank you for your business.",
    goodsOrServicesProvided: false,
    goodsOrServicesDescription: "",
    goodsOrServicesValue: 0,
  };
}

export type InvoiceTotals = { subtotal: number; tax: number; total: number };

export function calcInvoiceTotals(invoice: Invoice): InvoiceTotals {
  const subtotal = invoice.lineItems.reduce((s, li) => s + li.qty * li.rate, 0);
  const tax = subtotal * (invoice.taxRatePct / 100);
  return { subtotal, tax, total: subtotal + tax };
}

/** The donor's actual tax-deductible amount: the full gift minus the
 * good-faith value of anything the organization gave back, per IRS
 * Pub. 1771. For a for-profit invoice this just isn't shown. */
export function calcDeductibleAmount(invoice: Invoice, totals: InvoiceTotals): number {
  const offset = invoice.goodsOrServicesProvided ? invoice.goodsOrServicesValue : 0;
  return Math.max(0, totals.total - offset);
}

/** The IRS Pub. 1771 written-acknowledgment statement, generated from
 * the receipt's own fields so the donor's letter always says the right
 * thing without the preparer having to remember the exact wording. */
export function donationAcknowledgmentText(invoice: Invoice): string {
  if (!invoice.goodsOrServicesProvided) {
    return "No goods or services were provided in exchange for this contribution, other than intangible religious benefits.";
  }
  const desc = invoice.goodsOrServicesDescription.trim() || "goods or services";
  return `In exchange for this contribution, the organization provided the following: ${desc}, with an estimated fair market value of ${fmt(
    invoice.goodsOrServicesValue
  )}. Only the portion of your contribution that exceeds this value is tax-deductible.`;
}
