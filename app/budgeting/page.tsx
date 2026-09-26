import { Budgeting } from "@/components/features/Budgeting";
import { DebtPayoffPlanner } from "@/components/features/DebtPayoffPlanner";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Budgeting" };

export default function BudgetingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Budgeting />
      <DebtPayoffPlanner />
    </div>
  );
}
