import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';

// Entry context: the Readiness Assessment links here with ?from=ra so the rail
// headline + gold banner switch to the "you've taken the first step" treatment.
// Anything else (direct lead-magnet traffic) defaults to 'direct'.
export default async function BudgetGapPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const entry = from === 'ra' ? 'ra' : 'direct';
  return (
    <main>
      <BudgetGapCalculator entry={entry} />
    </main>
  );
}
