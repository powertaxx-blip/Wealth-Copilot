import { CashFlow } from "@/components/features/CashFlow";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cash-Flow Forecast" };

export default function CashFlowPage() {
  return <CashFlow />;
}
