import { BusinessExpenses } from "@/components/features/BusinessExpenses";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Business Expenses" };

export default function BizExpensesPage() {
  return <BusinessExpenses />;
}
