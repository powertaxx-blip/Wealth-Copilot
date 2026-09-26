import { TaxEstimator } from "@/components/features/TaxEstimator";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Tax Estimator" };

export default function EstimatorPage() {
  return <TaxEstimator />;
}
