import { GrantTracking } from "@/components/features/Grants";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Grant Tracking & Writing" };

export default function GrantsPage() {
  return <GrantTracking />;
}
