// Shared payload builder for Blueprint §3 (updateAssetInventory).
// Called from both MaritalEstateInventory and PersonalPropertyInventory so
// §3 receives the same combined MEI + PP shape no matter which component
// is mounted when the user edits.

export function buildAssetInventoryPayload({
  items,
  summary,
  categoryTotals,
  itemsBySection,
  adjustedSummary,
  checklistItems,
  personalPropertySummary,
  personalPropertyRooms,
  ALL_SECTIONS,
  LIABILITY_KEYS,
}) {
  const assetsByCategory = {};
  const liabilitiesByCategory = {};
  for (const section of ALL_SECTIONS) {
    const t = categoryTotals[section.key];
    if (!t || t.total === 0) continue;
    const count =
      section.key === 'personalProperty'
        ? (personalPropertySummary?.totalItems || 0)
        : (itemsBySection[section.key]?.length || 0);
    if (LIABILITY_KEYS.has(section.key)) {
      liabilitiesByCategory[section.key] = { total: t.total, count };
    } else {
      assetsByCategory[section.key] = { total: t.total, count };
    }
  }

  const divisionStatus = Object.keys(categoryTotals).reduce(
    (acc, key) => {
      if (LIABILITY_KEYS.has(key)) return acc;
      const t = categoryTotals[key] || {};
      return {
        client: acc.client + (t.client || 0),
        spouse: acc.spouse + (t.spouse || 0),
        undecided: acc.undecided + (t.unallocated || 0),
      };
    },
    { client: 0, spouse: 0, undecided: 0 }
  );

  const docsGathered = (checklistItems || []).filter(
    (i) => i.status === 'collected' || i.status === 'located'
  ).length;

  const ppHasItems =
    personalPropertySummary && (personalPropertySummary.totalItems || 0) > 0;

  return {
    totalAssets: adjustedSummary.totalAssets || 0,
    totalLiabilities: summary?.totalLiabilities || 0,
    itemCount: items.length + (personalPropertySummary?.totalItems || 0),
    assetsByCategory,
    liabilitiesByCategory,
    divisionStatus,
    documentsGathered: docsGathered,
    documentsTotal: checklistItems?.length || 0,
    personalProperty: ppHasItems
      ? {
          totalEstimatedValue: personalPropertySummary.totalValue || 0,
          itemCount: personalPropertySummary.totalItems || 0,
          roomCount: personalPropertyRooms?.length || 0,
        }
      : null,
  };
}
