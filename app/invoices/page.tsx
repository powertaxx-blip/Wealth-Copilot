import { ComingNext } from "@/components/ui/ComingNext";

export default function InvoicesPage() {
  return (
    <ComingNext
      title="Invoices & Accounts Receivable"
      description="Logs invoices, auto-flags overdue ones against today's date, and totals outstanding vs. collected."
      oldPanelId="invoices"
    />
  );
}
