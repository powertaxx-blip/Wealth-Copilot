import { DonorRetention } from "@/components/features/DonorRetention";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Donor Retention" };

export default function DonorRetentionPage() {
  return <DonorRetention />;
}
