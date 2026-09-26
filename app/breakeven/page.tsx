import { BreakEvenCalculator } from "@/components/features/BreakEvenCalculator";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Break-Even & Pricing" };

export default function BreakEvenPage() {
  return <BreakEvenCalculator />;
}
