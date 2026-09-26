import { FinancialHealth } from "@/components/features/FinancialHealth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Financial Health" };

export default function FinancialHealthPage() {
  return <FinancialHealth />;
}
