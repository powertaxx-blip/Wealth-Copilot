import { InvestmentFund } from "@/components/features/InvestmentFund";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Investment Fund" };

export default function InvestmentPage() {
  return <InvestmentFund />;
}
