import { BalanceSheet } from "@/components/features/BalanceSheet";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Balance Sheet / Statement of Financial Position" };

export default function BalancePage() {
  return <BalanceSheet />;
}
