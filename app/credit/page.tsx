import { CreditHealth } from "@/components/features/CreditHealth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Credit Health" };

export default function CreditPage() {
  return <CreditHealth />;
}
