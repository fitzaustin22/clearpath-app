import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// TODO: For authenticated users (Essentials+), swap storage engine from
// localStorage to a Supabase-backed custom storage adapter so state
// survives across sessions and devices. The store shape stays identical;
// only the `storage` option in the persist config changes.

// ─── Category total counts (used by updateChecklistItem to compute progress) ──
const CATEGORY_TOTALS = {
  taxReturns: 6,
  incomeDocumentation: 5,
  bankAndCash: 5,
  investmentAccounts: 5,
  retirementAccounts: 5,
  realEstate: 5,
  debtAndLiabilities: 6,
  legalAndInsurance: 5,
};

function recomputeChecklistDerived(items) {
  const total = items.length;
  if (total === 0) {
    return {
      overallProgress: 0,
      completionScore: 0,
      categoryProgress: Object.fromEntries(
        Object.entries(CATEGORY_TOTALS).map(([key, n]) => [
          key,
          { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: n },
        ])
      ),
    };
  }

  const collected = items.filter((i) => i.status === 'collected').length;
  const located = items.filter((i) => i.status === 'located').length;
  const notApplicable = items.filter((i) => i.status === 'not-applicable').length;
  const notStarted = items.filter((i) => i.status === 'not-started').length;
  const touched = total - notStarted;

  const overallProgress = (touched / total) * 100;
  const completionScore =
    ((collected * 3 + located * 1 + notApplicable * 2) / (total * 3)) * 100;

  const categoryProgress = {};
  for (const [key, catTotal] of Object.entries(CATEGORY_TOTALS)) {
    const catItems = items.filter((i) => i.category === key);
    const catCollected = catItems.filter((i) => i.status === 'collected').length;
    const catLocated = catItems.filter((i) => i.status === 'located').length;
    const catNotApplicable = catItems.filter((i) => i.status === 'not-applicable').length;
    const catNotStarted = catItems.filter((i) => i.status === 'not-started').length;
    const catTouched = catTotal - catNotStarted;
    categoryProgress[key] = {
      progress: catTotal > 0 ? (catTouched / catTotal) * 100 : 0,
      collected: catCollected,
      located: catLocated,
      notApplicable: catNotApplicable,
      notStarted: catNotStarted,
    };
  }

  return { overallProgress, completionScore, categoryProgress };
}

// ─── Initial state shapes ──────────────────────────────────────────────────────

const initialDocumentChecklist = {
  items: [],                 // Full 42-item array after initChecklistItems is called
  overallProgress: 0,
  completionScore: 0,
  categoryProgress: {
    taxReturns:          { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 6 },
    incomeDocumentation: { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
    bankAndCash:         { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
    investmentAccounts:  { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
    retirementAccounts:  { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
    realEstate:          { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
    debtAndLiabilities:  { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 6 },
    legalAndInsurance:   { progress: 0, collected: 0, located: 0, notApplicable: 0, notStarted: 5 },
  },
  startedAt: null,
  lastUpdatedAt: null,
  expandedCategories: [],   // UI: which accordion sections are open
  milestonesFired: [],      // Dedup: ["first", "25%", "50%", ...] — never re-shows
};

// ─── Marital Estate Inventory (Tool 2) ────────────────────────────────────────

const LIABILITY_CATEGORIES = ['loans', 'creditCards', 'otherDebt'];
const CLASSIFICATION_RELEVANT_FIELDS = ['titleholder', 'dateAcquired', 'sourceOfPayment', 'category'];

// Asset classification logic (categories 1–9). Exit-early pattern per spec.
function classifyAsset(item, marriageDate) {
  if (!marriageDate) {
    if (item.sourceOfPayment === 'mixed') return 'commingled';
    return 'unknown';
  }
  if (!item.dateAcquired) return 'unknown';
  if (item.sourceOfPayment === 'mixed') return 'commingled';

  const acquired = new Date(item.dateAcquired);
  const married = new Date(marriageDate);

  if (acquired < married) {
    // Pre-marital
    if (item.sourceOfPayment === 'separate-funds' && item.titleholder === 'self') return 'separate';
    if (item.titleholder === 'joint') return 'commingled';
    return 'separate';
  }
  // During marriage (includes the marriage date itself)
  if (item.sourceOfPayment === 'gift' || item.sourceOfPayment === 'inheritance') {
    if (item.titleholder === 'self') return 'separate';
    if (item.titleholder === 'joint') return 'commingled';
    return 'separate';
  }
  return 'marital';
}

// Liability classification logic (categories 10–12). Simplified rule set.
function classifyLiability(item, marriageDate) {
  if (!marriageDate) return 'unknown';
  if (!item.dateAcquired) return 'unknown';

  const acquired = new Date(item.dateAcquired);
  const married = new Date(marriageDate);

  if (acquired < married) return 'separate';
  return 'marital';
}

function runClassification(item, marriageDate) {
  const isLiability = LIABILITY_CATEGORIES.includes(item.category);
  return isLiability
    ? classifyLiability(item, marriageDate)
    : classifyAsset(item, marriageDate);
}

// Allocation engine + completeness score. See THE DIVISION SUMMARY spec section.
function recomputeSummary(items) {
  let clientAssets = 0;
  let spouseAssets = 0;
  let unallocatedAssets = 0;
  let clientLiabilities = 0;
  let spouseLiabilities = 0;
  let unallocatedLiabilities = 0;

  for (const item of items) {
    const isLiability = LIABILITY_CATEGORIES.includes(item.category);
    const currentValue = Number(item.currentValue) || 0;
    const outstandingBalance = Number(item.outstandingBalance) || 0;

    // Step 1: net value
    // For assets: currentValue - outstandingBalance (or just currentValue if no balance)
    // For liabilities: outstandingBalance field is not used — currentValue IS the balance owed
    const netValue = isLiability ? currentValue : currentValue - outstandingBalance;

    if (netValue === 0) continue;

    // Step 2: classification override — disputed/unknown go to Unallocated
    if (item.classification === 'disputed' || item.classification === 'unknown') {
      if (isLiability) unallocatedLiabilities += netValue;
      else unallocatedAssets += netValue;
      continue;
    }

    // Step 3: allocate by titleholder
    if (item.titleholder === 'self') {
      if (isLiability) clientLiabilities += netValue;
      else clientAssets += netValue;
    } else if (item.titleholder === 'spouse') {
      if (isLiability) spouseLiabilities += netValue;
      else spouseAssets += netValue;
    } else if (item.titleholder === 'joint') {
      const half = netValue / 2;
      if (isLiability) {
        clientLiabilities += half;
        spouseLiabilities += half;
      } else {
        clientAssets += half;
        spouseAssets += half;
      }
    } else {
      // 'other' or 'unknown' or anything else → Unallocated
      if (isLiability) unallocatedLiabilities += netValue;
      else unallocatedAssets += netValue;
    }
  }

  const totalAssets = clientAssets + spouseAssets + unallocatedAssets;
  const totalLiabilities = clientLiabilities + spouseLiabilities + unallocatedLiabilities;
  const clientNetEstate = clientAssets - clientLiabilities;
  const spouseNetEstate = spouseAssets - spouseLiabilities;
  const netMaritalEstate = totalAssets - totalLiabilities;

  // Percentages calculated on allocated net estate only (excludes unallocated)
  const allocatedTotal = clientNetEstate + spouseNetEstate;
  const clientPercentage = allocatedTotal !== 0 ? (clientNetEstate / allocatedTotal) * 100 : 0;
  const spousePercentage = allocatedTotal !== 0 ? (spouseNetEstate / allocatedTotal) * 100 : 0;

  const summary = {
    totalAssets,
    totalLiabilities,
    netMaritalEstate,
    clientAssets,
    spouseAssets,
    clientLiabilities,
    spouseLiabilities,
    unallocatedAssets,
    unallocatedLiabilities,
    clientNetEstate,
    spouseNetEstate,
    clientPercentage,
    spousePercentage,
  };

  // Completeness score
  const totalItems = items.length;
  let completenessScore = 0;
  if (totalItems > 0) {
    let itemsWithDescription = 0;
    let itemsWithValue = 0;
    let itemsWithTitleholder = 0;
    let itemsWithClassification = 0;
    let itemsWithDateAcquired = 0;
    for (const item of items) {
      if (item.description && String(item.description).trim() !== '') itemsWithDescription++;
      if (item.currentValue != null && Number(item.currentValue) > 0) itemsWithValue++;
      if (item.titleholder && item.titleholder !== 'unknown') itemsWithTitleholder++;
      if (item.classification && item.classification !== 'unknown') itemsWithClassification++;
      if (item.dateAcquired) itemsWithDateAcquired++;
    }
    const numerator =
      itemsWithDescription * 1 +
      itemsWithValue * 2 +
      itemsWithTitleholder * 1 +
      itemsWithClassification * 2 +
      itemsWithDateAcquired * 1;
    completenessScore = (numerator / (totalItems * 7)) * 100;
  }

  return { summary, completenessScore };
}

const initialMaritalEstateInventory = {
  marriageDate: null,
  items: [],
  completenessScore: 0,
  summary: {
    totalAssets: 0,
    totalLiabilities: 0,
    netMaritalEstate: 0,
    clientAssets: 0,
    spouseAssets: 0,
    clientLiabilities: 0,
    spouseLiabilities: 0,
    unallocatedAssets: 0,
    unallocatedLiabilities: 0,
    clientNetEstate: 0,
    spouseNetEstate: 0,
    clientPercentage: 0,
    spousePercentage: 0,
  },
  startedAt: null,
  lastUpdatedAt: null,
};

// ─── Personal Property Inventory (Tool 3) ─────────────────────────────────────

const DEFAULT_ROOMS = [
  'Living Room', 'Master Bedroom', 'Kitchen', 'Dining Room',
  'Bedroom 2', 'Bedroom 3', 'Bathroom(s)', 'Garage',
  'Home Office', 'Basement/Attic', 'Outdoor/Yard',
];

// eslint-disable-next-line no-unused-vars
const HIGH_VALUE_CATEGORIES = [
  'Vehicles',
  'Jewelry and Watches',
  'Art and Antiques',
  'Collections',
  'Firearms',
  'Musical Instruments',
  'Electronics',
  'Sporting Equipment',
  "Children's Property",
  'Furs and Outerwear',
  'Silverware, China, and Crystal',
];

// Thresholds used by updatePersonalPropertyItem to auto-flag items for
// appraisal. Threshold === 0 means always flag. 'Collections' threshold
// applies to the sum across the category, not per-item. Categories not
// listed here are never auto-flagged.
const APPRAISAL_THRESHOLDS = {
  'Jewelry and Watches': 1000,
  'Art and Antiques': 2500,
  'Collections': 5000,
  'Vehicles': 0,
  'Firearms': 0,
};

function evaluateAppraisalFlags(highValueItems) {
  // First pass: compute category totals (only needed for 'Collections',
  // which flags based on category-wide total rather than per-item value)
  const collectionsTotal = highValueItems
    .filter((i) => i.location === 'Collections')
    .reduce((s, i) => s + (Number(i.currentValue) || 0), 0);

  return highValueItems.map((item) => {
    const threshold = APPRAISAL_THRESHOLDS[item.location];
    if (threshold === undefined) {
      return { ...item, appraisalFlagged: false };
    }
    if (threshold === 0) {
      // Vehicles, Firearms — always flag
      return { ...item, appraisalFlagged: true };
    }
    if (item.location === 'Collections') {
      return { ...item, appraisalFlagged: collectionsTotal > threshold };
    }
    return {
      ...item,
      appraisalFlagged: (Number(item.currentValue) || 0) > threshold,
    };
  });
}

function recomputePersonalPropertySummary(rooms, highValueItems) {
  const roomItems = rooms.flatMap((r) => r.items);
  const allItems = [...roomItems, ...highValueItems];

  const totalItems = allItems.length;
  const sumValue = (arr) =>
    arr.reduce((s, i) => s + (Number(i.currentValue) || 0), 0);

  const totalValue = sumValue(allItems);
  const clientValue = sumValue(allItems.filter((i) => i.whoKeeps === 'self'));
  const spouseValue = sumValue(allItems.filter((i) => i.whoKeeps === 'spouse'));
  const disputedValue = sumValue(allItems.filter((i) => i.whoKeeps === 'disputed'));
  const undecidedValue = sumValue(allItems.filter((i) => i.whoKeeps === 'undecided'));

  const highValueItemCount = highValueItems.length;
  const appraisalFlags = highValueItems
    .filter((i) => i.appraisalFlagged)
    .map((i) => i.id);
  const appraisalRecommended = appraisalFlags.length > 0;

  let inventoryCompleteness = 0;
  if (totalItems > 0) {
    const valuedItems = allItems.filter((i) => (Number(i.currentValue) || 0) > 0);
    const decidedItems = allItems.filter((i) => i.whoKeeps !== 'undecided');
    inventoryCompleteness = Math.round(
      ((valuedItems.length + decidedItems.length) / (totalItems * 2)) * 100
    );
  }

  return {
    summary: {
      totalItems,
      totalValue,
      clientValue,
      spouseValue,
      disputedValue,
      undecidedValue,
      highValueItemCount,
      appraisalRecommended,
      appraisalFlags,
    },
    inventoryCompleteness,
  };
}

const initialPersonalPropertyInventory = {
  rooms: [],
  highValueItems: [],
  summary: {
    totalItems: 0,
    totalValue: 0,
    clientValue: 0,
    spouseValue: 0,
    disputedValue: 0,
    undecidedValue: 0,
    highValueItemCount: 0,
    appraisalRecommended: false,
    appraisalFlags: [],
  },
  inventoryCompleteness: 0,
  startedAt: null,
  lastUpdatedAt: null,
  activeTab: 'rooms',
  selectedRoomIndex: 0,
  duplicateReminderShown: {},
};

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useM2Store = create(
  persist(
    (set) => ({
      documentChecklist: { ...initialDocumentChecklist },
      maritalEstateInventory: { ...initialMaritalEstateInventory },
      personalPropertyInventory: { ...initialPersonalPropertyInventory },

      // ── Checklist: populate all 42 items from the master list on first mount ──
      initChecklistItems: (items) =>
        set((state) => {
          const derived = recomputeChecklistDerived(items);
          return {
            documentChecklist: {
              ...state.documentChecklist,
              items,
              ...derived,
            },
          };
        }),

      // ── Checklist: update one item's status and/or notes, recompute derived ──
      updateChecklistItem: (id, update) =>
        set((state) => {
          const now = new Date().toISOString();
          const prevItems = state.documentChecklist.items;
          const newItems = prevItems.map((i) =>
            i.id === id ? { ...i, ...update } : i
          );

          const derived = recomputeChecklistDerived(newItems);

          return {
            documentChecklist: {
              ...state.documentChecklist,
              items: newItems,
              ...derived,
              lastUpdatedAt: now,
              startedAt: state.documentChecklist.startedAt || now,
            },
          };
        }),

      // ── Checklist: toggle an accordion category open/closed ──
      toggleExpandedCategory: (categoryKey) =>
        set((state) => {
          const current = state.documentChecklist.expandedCategories;
          const next = current.includes(categoryKey)
            ? current.filter((k) => k !== categoryKey)
            : [...current, categoryKey];
          return {
            documentChecklist: {
              ...state.documentChecklist,
              expandedCategories: next,
            },
          };
        }),

      // ── Checklist: record a fired milestone (idempotent) ──
      fireMilestone: (milestoneId) =>
        set((state) => {
          if (state.documentChecklist.milestonesFired.includes(milestoneId)) {
            return state;
          }
          return {
            documentChecklist: {
              ...state.documentChecklist,
              milestonesFired: [
                ...state.documentChecklist.milestonesFired,
                milestoneId,
              ],
            },
          };
        }),

      // ── Checklist: full reset ──
      resetDocumentChecklist: () =>
        set({ documentChecklist: { ...initialDocumentChecklist } }),

      // ── Inventory: populate items array and recompute summary ──
      initInventoryItems: (items) =>
        set((state) => {
          const { summary, completenessScore } = recomputeSummary(items);
          return {
            maritalEstateInventory: {
              ...state.maritalEstateInventory,
              items,
              summary,
              completenessScore,
            },
          };
        }),

      // ── Inventory: add a new item (optionally auto-classify) ──
      addInventoryItem: (item, autoClassify = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const { marriageDate, items } = state.maritalEstateInventory;

          const newItem = { ...item };
          // If classification wasn't explicitly set by the caller, apply default/auto
          const classificationProvided =
            newItem.classification && newItem.classification !== 'unknown';

          if (classificationProvided) {
            // Caller set it explicitly — mark as user source unless already set
            if (!newItem.classificationSource) newItem.classificationSource = 'user';
          } else if (autoClassify) {
            newItem.classification = runClassification(newItem, marriageDate);
            newItem.classificationSource = 'auto';
          } else {
            newItem.classification = 'unknown';
            if (!newItem.classificationSource) newItem.classificationSource = null;
          }

          const newItems = [...items, newItem];
          const { summary, completenessScore } = recomputeSummary(newItems);

          return {
            maritalEstateInventory: {
              ...state.maritalEstateInventory,
              items: newItems,
              summary,
              completenessScore,
              lastUpdatedAt: now,
              startedAt: state.maritalEstateInventory.startedAt || now,
            },
          };
        }),

      // ── Inventory: merge update into item; re-run classification when relevant ──
      updateInventoryItem: (id, update, autoClassify = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const { marriageDate, items } = state.maritalEstateInventory;

          const newItems = items.map((item) => {
            if (item.id !== id) return item;
            const merged = { ...item, ...update };

            // Case 1: user explicitly set classification via dropdown
            if (update.classification !== undefined) {
              merged.classification = update.classification;
              merged.classificationSource = 'user';
              return merged;
            }

            // Case 2: auto-classify if a relevant field changed and not user-locked
            const relevantChanged = CLASSIFICATION_RELEVANT_FIELDS.some(
              (f) => update[f] !== undefined && update[f] !== item[f]
            );
            if (autoClassify && relevantChanged && merged.classificationSource !== 'user') {
              merged.classification = runClassification(merged, marriageDate);
              merged.classificationSource = 'auto';
            }

            return merged;
          });

          const { summary, completenessScore } = recomputeSummary(newItems);

          return {
            maritalEstateInventory: {
              ...state.maritalEstateInventory,
              items: newItems,
              summary,
              completenessScore,
              lastUpdatedAt: now,
              startedAt: state.maritalEstateInventory.startedAt || now,
            },
          };
        }),

      // ── Inventory: remove an item by id ──
      removeInventoryItem: (id) =>
        set((state) => {
          const now = new Date().toISOString();
          const newItems = state.maritalEstateInventory.items.filter((i) => i.id !== id);
          const { summary, completenessScore } = recomputeSummary(newItems);

          return {
            maritalEstateInventory: {
              ...state.maritalEstateInventory,
              items: newItems,
              summary,
              completenessScore,
              lastUpdatedAt: now,
            },
          };
        }),

      // ── Inventory: set marriage date and re-run classification on all items ──
      setMarriageDate: (date, autoClassify = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const { items } = state.maritalEstateInventory;

          let newItems = items;
          if (autoClassify) {
            newItems = items.map((item) => {
              if (item.classificationSource === 'user') return item;
              return {
                ...item,
                classification: runClassification(item, date),
                classificationSource: 'auto',
              };
            });
          }

          const { summary, completenessScore } = recomputeSummary(newItems);

          return {
            maritalEstateInventory: {
              ...state.maritalEstateInventory,
              marriageDate: date,
              items: newItems,
              summary,
              completenessScore,
              lastUpdatedAt: now,
              startedAt: state.maritalEstateInventory.startedAt || now,
            },
          };
        }),

      // ── Inventory: full reset ──
      resetMaritalEstateInventory: () =>
        set({ maritalEstateInventory: { ...initialMaritalEstateInventory } }),

      // ── Personal Property: initialize default rooms + start timestamp ──
      initPersonalProperty: () =>
        set((state) => {
          const ppi = state.personalPropertyInventory;
          const now = new Date().toISOString();
          const rooms =
            ppi.rooms.length === 0
              ? DEFAULT_ROOMS.map((name) => ({ name, items: [] }))
              : ppi.rooms;
          const newHighValueItems = evaluateAppraisalFlags(ppi.highValueItems);
          const { summary, inventoryCompleteness } =
            recomputePersonalPropertySummary(rooms, newHighValueItems);
          return {
            personalPropertyInventory: {
              ...ppi,
              rooms,
              highValueItems: newHighValueItems,
              summary,
              inventoryCompleteness,
              startedAt: ppi.startedAt || now,
            },
          };
        }),

      // ── Personal Property: append a new room ──
      addRoom: (roomName) =>
        set((state) => {
          const now = new Date().toISOString();
          const ppi = state.personalPropertyInventory;
          return {
            personalPropertyInventory: {
              ...ppi,
              rooms: [...ppi.rooms, { name: roomName, items: [] }],
              lastUpdatedAt: now,
            },
          };
        }),

      // ── Personal Property: remove a room by index ──
      removeRoom: (roomIndex) =>
        set((state) => {
          const now = new Date().toISOString();
          const ppi = state.personalPropertyInventory;
          const newRooms = ppi.rooms.filter((_, idx) => idx !== roomIndex);
          let newSelectedRoomIndex = ppi.selectedRoomIndex;
          if (newSelectedRoomIndex >= newRooms.length) {
            newSelectedRoomIndex = Math.max(0, newRooms.length - 1);
          }
          const { summary, inventoryCompleteness } =
            recomputePersonalPropertySummary(newRooms, ppi.highValueItems);
          return {
            personalPropertyInventory: {
              ...ppi,
              rooms: newRooms,
              selectedRoomIndex: newSelectedRoomIndex,
              summary,
              inventoryCompleteness,
              lastUpdatedAt: now,
            },
          };
        }),

      // ── Personal Property: add an item (returns generated id) ──
      addPersonalPropertyItem: (location, isHighValue = false) => {
        const id = `pp-${location.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now()}`;
        set((state) => {
          const now = new Date().toISOString();
          const ppi = state.personalPropertyInventory;
          const newItem = {
            id,
            location,
            description: '',
            serialNumber: null,
            quantity: 1,
            purchasedDuringMarriage: 'unknown',
            currentValue: 0,
            whoKeeps: 'undecided',
            notes: '',
            appraisalFlagged: false,
          };

          let newRooms = ppi.rooms;
          let newHighValueItems = ppi.highValueItems;

          if (isHighValue) {
            newHighValueItems = evaluateAppraisalFlags([...ppi.highValueItems, newItem]);
          } else {
            // Prefer rooms[selectedRoomIndex]; fall back to a room whose
            // name matches the `location` argument if the selected room
            // doesn't match.
            let targetIndex = ppi.selectedRoomIndex;
            const selectedRoom = ppi.rooms[targetIndex];
            if (!selectedRoom || selectedRoom.name !== location) {
              const byName = ppi.rooms.findIndex((r) => r.name === location);
              if (byName !== -1) targetIndex = byName;
            }
            newRooms = ppi.rooms.map((room, idx) =>
              idx === targetIndex
                ? { ...room, items: [...room.items, newItem] }
                : room
            );
          }

          const { summary, inventoryCompleteness } =
            recomputePersonalPropertySummary(newRooms, newHighValueItems);

          return {
            personalPropertyInventory: {
              ...ppi,
              rooms: newRooms,
              highValueItems: newHighValueItems,
              summary,
              inventoryCompleteness,
              startedAt: ppi.startedAt || now,
              lastUpdatedAt: now,
            },
          };
        });
        return id;
      },

      // ── Personal Property: merge updates; re-evaluate appraisal flags ──
      updatePersonalPropertyItem: (itemId, updates, isHighValue = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const ppi = state.personalPropertyInventory;

          let newRooms = ppi.rooms;
          let newHighValueItems = ppi.highValueItems;

          if (isHighValue) {
            let merged = ppi.highValueItems.map((item) =>
              item.id === itemId ? { ...item, ...updates } : item
            );
            merged = evaluateAppraisalFlags(merged);
            newHighValueItems = merged;
          } else {
            // Room items never participate in appraisal flagging.
            newRooms = ppi.rooms.map((room) => ({
              ...room,
              items: room.items.map((item) =>
                item.id === itemId ? { ...item, ...updates } : item
              ),
            }));
          }

          const { summary, inventoryCompleteness } =
            recomputePersonalPropertySummary(newRooms, newHighValueItems);

          return {
            personalPropertyInventory: {
              ...ppi,
              rooms: newRooms,
              highValueItems: newHighValueItems,
              summary,
              inventoryCompleteness,
              lastUpdatedAt: now,
            },
          };
        }),

      // ── Personal Property: remove an item by id ──
      removePersonalPropertyItem: (itemId, isHighValue = false) =>
        set((state) => {
          const now = new Date().toISOString();
          const ppi = state.personalPropertyInventory;

          let newRooms = ppi.rooms;
          let newHighValueItems = ppi.highValueItems;

          if (isHighValue) {
            newHighValueItems = evaluateAppraisalFlags(
              ppi.highValueItems.filter((i) => i.id !== itemId)
            );
          } else {
            newRooms = ppi.rooms.map((room) => ({
              ...room,
              items: room.items.filter((i) => i.id !== itemId),
            }));
          }

          const { summary, inventoryCompleteness } =
            recomputePersonalPropertySummary(newRooms, newHighValueItems);

          return {
            personalPropertyInventory: {
              ...ppi,
              rooms: newRooms,
              highValueItems: newHighValueItems,
              summary,
              inventoryCompleteness,
              lastUpdatedAt: now,
            },
          };
        }),

      // ── Personal Property: full reset ──
      resetPersonalPropertyInventory: () =>
        set({ personalPropertyInventory: { ...initialPersonalPropertyInventory } }),
    }),
    {
      name: 'm2-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        documentChecklist: state.documentChecklist,
        maritalEstateInventory: state.maritalEstateInventory,
        // Exclude UI-only keys (activeTab, selectedRoomIndex, duplicateReminderShown)
        personalPropertyInventory: {
          rooms: state.personalPropertyInventory.rooms,
          highValueItems: state.personalPropertyInventory.highValueItems,
          summary: state.personalPropertyInventory.summary,
          inventoryCompleteness: state.personalPropertyInventory.inventoryCompleteness,
          startedAt: state.personalPropertyInventory.startedAt,
          lastUpdatedAt: state.personalPropertyInventory.lastUpdatedAt,
        },
      }),
    }
  )
);
