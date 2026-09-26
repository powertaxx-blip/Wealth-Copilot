import { WillsEstates } from "@/components/features/WillsEstates";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Wills & Estates" };

export default function WillsPage() {
  return <WillsEstates />;
}
