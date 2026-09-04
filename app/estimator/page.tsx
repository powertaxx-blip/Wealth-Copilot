import { ComingNext } from "@/components/ui/ComingNext";

export default function EstimatorPage() {
  return (
    <ComingNext
      title="Tax Estimator"
      description="Federal + Pennsylvania + Chester County tax, EITC, and the quarterly estimated-payment schedule. The most math-heavy panel — planned as the first port after Break-Even, since its calcFederalTax()/calcSETax()/calcEITC() functions are pure and port almost unchanged into lib/tax.ts."
      oldPanelId="estimator"
    />
  );
}
