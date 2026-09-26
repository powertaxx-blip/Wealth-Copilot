import { FilingStatusGuide } from "@/components/features/FilingStatusGuide";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Filing Status Guide" };

export default function FilingPage() {
  return <FilingStatusGuide />;
}
