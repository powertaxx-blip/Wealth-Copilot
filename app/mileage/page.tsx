import { MileageTracker } from "@/components/features/MileageTracker";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mileage Tracker" };

export default function MileagePage() {
  return <MileageTracker />;
}
