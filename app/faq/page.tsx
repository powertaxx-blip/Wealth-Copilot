import { FAQ } from "@/components/features/FAQ";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return <FAQ />;
}
