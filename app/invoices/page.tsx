import { Invoices } from "@/components/features/Invoices";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Invoices & AR / Donation Receipts" };

export default function InvoicesPage() {
  return <Invoices />;
}
