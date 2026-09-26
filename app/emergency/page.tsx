import { EmergencyFund } from "@/components/features/EmergencyFund";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Emergency Fund / Operating Reserve" };

export default function EmergencyPage() {
  return <EmergencyFund />;
}
