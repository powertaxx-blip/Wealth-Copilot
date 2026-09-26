import { Contractors } from "@/components/features/Contractors";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "1099 Contractors" };

export default function ContractorsPage() {
  return <Contractors />;
}
