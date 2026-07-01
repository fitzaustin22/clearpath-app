import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';

// Standalone Budget Gap Calculator — the public lead-magnet surface (cold
// traffic). The "first step" rail/banner treatment now rides solely on store
// state (readinessAssessment.completed), so no ?from=ra entry param is read or
// needed here.
export default function BudgetGapPage() {
  return (
    <main>
      <BudgetGapCalculator />
    </main>
  );
}
