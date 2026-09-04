import { ComingNext } from "@/components/ui/ComingNext";

export default function ScheduleCPage() {
  return (
    <ComingNext
      title="Schedule C Builder"
      description="Builds a real IRS-format Schedule C line by line, and can push its net profit into the Tax Estimator."
      oldPanelId="schedulec"
    />
  );
}
