/**
 * Schematic taxonomy — the 12-card / 4-zone presentational map for the Blueprint
 * schematic inset. This is a STATIC PRESENTATIONAL layer keyed off real
 * blueprintStore section IDs. Nothing here is stored; nothing here is derived
 * from user data. The mapping is the contract between the schematic design and
 * the store's section taxonomy.
 *
 * Mapping resolution (Phase 1 HALT — option B): keep the design's zone
 * assignments and column counts verbatim; relabel two design cards so all 12
 * design slots bind 1:1 to the 12 real store sections.
 *   • design "Debts & Liabilities"  →  s9 Home Decision      (relabeled)
 *   • design "Real Property"        →  s5 Property Division  (relabeled)
 *
 * Card ORDER within each zone matches the design verbatim. Zone labels are the
 * design's verbatim labels. Column counts (A=4, B=5, C=2, D=1) are locked.
 */

export const ZONES = Object.freeze([
  { id: 'A', label: 'FOUNDATION', columns: 4 },
  { id: 'B', label: 'ANALYSIS · WHAT’S AT STAKE', columns: 5 },
  { id: 'C', label: 'STRATEGY', columns: 2 },
  { id: 'D', label: 'RESOLUTION', columns: 1 },
]);

export const SCHEMATIC_CARDS = Object.freeze([
  { storeKey: 's1',  zone: 'A', label: 'Your Story & Goals' },
  { storeKey: 's3',  zone: 'A', label: 'Asset Inventory' },
  { storeKey: 's9',  zone: 'A', label: 'Home Decision' },
  { storeKey: 's2',  zone: 'A', label: 'Income Analysis' },
  { storeKey: 's5',  zone: 'B', label: 'Property Division' },
  { storeKey: 's6',  zone: 'B', label: 'Retirement & Pensions' },
  { storeKey: 's7',  zone: 'B', label: 'Expense & Budget' },
  { storeKey: 's4',  zone: 'B', label: 'Tax Impact' },
  { storeKey: 's8',  zone: 'B', label: 'Support Analysis' },
  { storeKey: 's10', zone: 'C', label: 'Priorities & Trade-offs' },
  { storeKey: 's11', zone: 'C', label: 'Settlement Scenarios' },
  { storeKey: 's12', zone: 'D', label: 'Action Plan' },
]);

export function cardsInZone(zoneId) {
  return SCHEMATIC_CARDS.filter((c) => c.zone === zoneId);
}
