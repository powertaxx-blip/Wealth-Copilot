import { Snapshot } from "@/components/features/Snapshot";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Snapshot" };

export default function SnapshotPage() {
  return <Snapshot />;
}
