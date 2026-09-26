import { PaycheckCheckup } from "@/components/features/PaycheckCheckup";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Paycheck Checkup" };

export default function PaycheckCheckupPage() {
  return <PaycheckCheckup />;
}
