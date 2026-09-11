import { Budgeting } from "@/components/features/Budgeting";
import { DebtPayoffPlanner } from "@/components/features/DebtPayoffPlanner";

export default function BudgetingPage() {
  return (
    <div className="flex flex-col gap-6">
      <Budgeting />
      <DebtPayoffPlanner />
    </div>
  );
}
