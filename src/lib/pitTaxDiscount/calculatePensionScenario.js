// Pension scenario method — weighted average of per-year TD% across payout years.
export function calculatePensionScenario(inputs) {
  const {
    planBalance,
    currentAge,
    withdrawalStartAge,
    withdrawalEndAge,
    effectiveTaxRate,
    discountRate,
  } = inputs;

  const TR = effectiveTaxRate / 100;
  const i  = discountRate / 100;
  // Inclusive of both endpoints — withdrawalEndAge is the LAST withdrawal year
  // (e.g. start 65, end 84 ⇒ ages 65..84 = 20 payment years).
  const totalPaymentYears = withdrawalEndAge - withdrawalStartAge + 1;

  const yearRows = [];
  let weightedTDSum = 0;

  for (let age = withdrawalStartAge; age <= withdrawalEndAge; age++) {
    const yearNum  = age - withdrawalStartAge + 1;
    const nForYear = age - currentAge;

    let tdPercentForYear;
    if (i === 0 || nForYear <= 0) {
      tdPercentForYear = TR;
    } else {
      const denom = (Math.pow(1 + i, nForYear) - 1) * (1 - TR) + 1;
      tdPercentForYear = TR / denom;
    }

    const allocation  = totalPaymentYears > 0 ? 1 / totalPaymentYears : 0;
    const weightedTD  = tdPercentForYear * allocation;
    weightedTDSum    += weightedTD;

    yearRows.push({
      yearNum,
      age,
      n: nForYear,
      tdPercent: tdPercentForYear * 100,
      allocation: allocation * 100, // display percent
      weightedTD: weightedTD * 100,
    });
  }

  const scenarioTDPercent = weightedTDSum * 100;
  const scenarioTDDollars = planBalance * weightedTDSum;

  return { yearRows, scenarioTDPercent, scenarioTDDollars };
}
