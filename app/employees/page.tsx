import { Employees } from "@/components/features/Employees";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Employees & Payroll" };

export default function EmployeesPage() {
  return <Employees />;
}
