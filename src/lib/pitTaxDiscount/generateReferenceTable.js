// Reference table: TD% matrix by age, tax rate, and retirement start.
// Uses the user's current discount rate, end age fixed at 85.
export function generateReferenceTable(discountRate) {
  const ages      = [35, 45, 55, 65];
  const taxRates  = [20, 25, 30, 35, 40];
  const retirementStarts = [
    { label: 'Early (55)',    startAge: 55 },
    { label: 'Normal (65)',   startAge: 65 },
    { label: 'Deferred (75)', startAge: 75 },
  ];
  const endAge = 85;
  const i = discountRate / 100;

  return ages.map((currentAge) => ({
    age: currentAge,
    rates: taxRates.map((rate) => ({
      rate,
      scenarios: retirementStarts.map(({ label, startAge }) => {
        const actualStart = Math.max(startAge, currentAge);
        const n = ((actualStart - currentAge) + (endAge - currentAge)) / 2;
        const TR = rate / 100;
        let tdPercent;
        if (i === 0 || n <= 0) {
          tdPercent = rate;
        } else {
          const denom = (Math.pow(1 + i, n) - 1) * (1 - TR) + 1;
          tdPercent = (TR / denom) * 100;
        }
        return { label, tdPercent, n };
      }),
    })),
  }));
}
