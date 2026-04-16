'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useM2Store } from '@/src/stores/m2Store';
import useBlueprintStore from '@/src/stores/blueprintStore';
import {
  ALL_SECTIONS,
  LIABILITY_KEYS,
  computeCategoryTotals,
} from '@/src/lib/m2Sections';
import { buildAssetInventoryPayload } from '@/src/lib/blueprintM2Payload';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const NAVY = '#1B2A4A';
const GOLD = '#C8A96E';
const PARCHMENT = '#FAF8F2';
const WHITE = '#FFFFFF';
const SURPLUS_GREEN = '#2D8A4E';
const SHORTFALL_RED = '#C0392B';
const NAVY_70 = 'rgba(27, 42, 74, 0.7)';
const NAVY_60 = 'rgba(27, 42, 74, 0.6)';
const NAVY_50 = 'rgba(27, 42, 74, 0.5)';
const NAVY_30 = 'rgba(27, 42, 74, 0.3)';
const NAVY_20 = 'rgba(27, 42, 74, 0.2)';

const PLAYFAIR = '"Playfair Display", Georgia, serif';
const SOURCE = '"Source Sans Pro", -apple-system, system-ui, sans-serif';

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

const APPRAISAL_PROMPTS = {
  'Jewelry and Watches':
    'Items valued over $1,000 should be professionally appraised. An independent appraisal protects both parties.',
  'Art and Antiques':
    'Art and antiques valued over $2,500 should be professionally appraised. The purchase price and current market value can differ significantly.',
  Collections:
    'Collections valued over $5,000 in total should be professionally appraised. Individual items may have appreciated substantially.',
  Vehicles:
    "Use Kelley Blue Book (kbb.com), Edmunds, or NADA Guides for vehicle values. Enter the 'private party' value, not the trade-in value.",
  Firearms:
    'Firearms should be valued by a licensed dealer or appraiser. Note: some states have specific rules about firearms in divorce — check with your attorney.',
};

const WHO_KEEPS_OPTIONS = [
  { value: 'self', label: 'You', bg: SURPLUS_GREEN, fg: WHITE },
  { value: 'spouse', label: 'Spouse', bg: NAVY, fg: WHITE },
  { value: 'disputed', label: 'Disputed', bg: SHORTFALL_RED, fg: WHITE },
  { value: 'undecided', label: 'Undecided', bg: NAVY_20, fg: NAVY },
];

const PURCHASED_OPTIONS = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
  { value: 'unknown', label: 'Unknown' },
];

const fmtMoney = (n) =>
  `$${Math.round(Number(n) || 0).toLocaleString()}`;

const srOnly = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  border: 0,
};

// ─── Viewport hook ────────────────────────────────────────────────────────────
function useViewportWidth() {
  const [width, setWidth] = useState(1200);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    handler();
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return width;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PersonalPropertyInventory() {
  const ppi = useM2Store((s) => s.personalPropertyInventory);
  const meiItems = useM2Store((s) => s.maritalEstateInventory.items);
  const meiSummary = useM2Store((s) => s.maritalEstateInventory.summary);
  const checklistItems = useM2Store((s) => s.documentChecklist.items);
  const initPersonalProperty = useM2Store((s) => s.initPersonalProperty);
  const addRoom = useM2Store((s) => s.addRoom);
  const removeRoom = useM2Store((s) => s.removeRoom);
  const addPersonalPropertyItem = useM2Store(
    (s) => s.addPersonalPropertyItem
  );
  const updatePersonalPropertyItem = useM2Store(
    (s) => s.updatePersonalPropertyItem
  );
  const removePersonalPropertyItem = useM2Store(
    (s) => s.removePersonalPropertyItem
  );
  const resetPersonalPropertyInventory = useM2Store(
    (s) => s.resetPersonalPropertyInventory
  );

  const { rooms, highValueItems, summary } = ppi;

  const width = useViewportWidth();
  const isMobile = width < 640;
  const isDesktop = width > 1024;

  const [activeTab, setActiveTab] = useState('rooms');
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [expandedItems, setExpandedItems] = useState({});
  const [expandedCategories, setExpandedCategories] = useState({});
  const [reminderShown, setReminderShown] = useState({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [focusItemId, setFocusItemId] = useState(null);
  const descriptionRefs = useRef({});

  // Initialize default rooms on mount
  useEffect(() => {
    initPersonalProperty();
  }, [initPersonalProperty]);

  // Clamp selectedRoomIndex if rooms shrinks
  useEffect(() => {
    if (rooms.length > 0 && selectedRoomIndex >= rooms.length) {
      setSelectedRoomIndex(rooms.length - 1);
    }
  }, [rooms.length, selectedRoomIndex]);

  // Focus newly added item's description field
  useEffect(() => {
    if (focusItemId && descriptionRefs.current[focusItemId]) {
      descriptionRefs.current[focusItemId].focus();
      setFocusItemId(null);
    }
  }, [focusItemId]);

  // ── Blueprint §3 sync (debounced 500ms) ────────────────────────────────────
  // Mirror of MEI's sync so §3 stays fresh even when only PP is mounted.
  useEffect(() => {
    if (meiItems.length === 0 && (summary?.totalItems || 0) === 0) return;
    const timer = setTimeout(() => {
      const itemsBySection = {};
      for (const section of ALL_SECTIONS) itemsBySection[section.key] = [];
      for (const item of meiItems) {
        if (itemsBySection[item.category]) itemsBySection[item.category].push(item);
      }

      const categoryTotals = computeCategoryTotals(meiItems);
      const pp = summary || {};
      const ppTotal = Number(pp.totalValue) || 0;
      const ppClient = Number(pp.clientValue) || 0;
      const ppSpouse = Number(pp.spouseValue) || 0;
      const ppUnallocated =
        (Number(pp.disputedValue) || 0) + (Number(pp.undecidedValue) || 0);
      categoryTotals['personalProperty'] = {
        total: ppTotal,
        client: ppClient,
        spouse: ppSpouse,
        unallocated: ppUnallocated,
      };

      const s = meiSummary || {};
      const totalAssets = (s.totalAssets || 0) + ppTotal;
      const clientAssets = (s.clientAssets || 0) + ppClient;
      const spouseAssets = (s.spouseAssets || 0) + ppSpouse;
      const unallocatedAssets = (s.unallocatedAssets || 0) + ppUnallocated;
      const clientNetEstate = clientAssets - (s.clientLiabilities || 0);
      const spouseNetEstate = spouseAssets - (s.spouseLiabilities || 0);
      const netMaritalEstate = totalAssets - (s.totalLiabilities || 0);
      const allocatedTotal = clientNetEstate + spouseNetEstate;
      const clientPercentage =
        allocatedTotal !== 0 ? (clientNetEstate / allocatedTotal) * 100 : 0;
      const spousePercentage =
        allocatedTotal !== 0 ? (spouseNetEstate / allocatedTotal) * 100 : 0;
      const adjustedSummary = {
        ...s,
        totalAssets,
        clientAssets,
        spouseAssets,
        unallocatedAssets,
        clientNetEstate,
        spouseNetEstate,
        netMaritalEstate,
        clientPercentage,
        spousePercentage,
      };

      const payload = buildAssetInventoryPayload({
        items: meiItems,
        summary: meiSummary,
        categoryTotals,
        itemsBySection,
        adjustedSummary,
        checklistItems,
        personalPropertySummary: summary,
        personalPropertyRooms: rooms,
        ALL_SECTIONS,
        LIABILITY_KEYS,
      });
      useBlueprintStore.getState().updateAssetInventory(payload);
    }, 500);
    return () => clearTimeout(timer);
  }, [meiItems, meiSummary, summary, rooms, checklistItems]);

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAddRoom = useCallback(() => {
    const name = window.prompt('Room name:');
    if (name && name.trim()) addRoom(name.trim());
  }, [addRoom]);

  const handleRemoveRoom = useCallback(
    (idx) => {
      const room = rooms[idx];
      if (!room) return;
      if (window.confirm(`Remove "${room.name}" and all its items?`)) {
        removeRoom(idx);
      }
    },
    [rooms, removeRoom]
  );

  const handleAddRoomItem = useCallback(() => {
    const room = rooms[selectedRoomIndex];
    if (!room) return;
    const id = addPersonalPropertyItem(room.name, false);
    setFocusItemId(id);
  }, [rooms, selectedRoomIndex, addPersonalPropertyItem]);

  const handleAddHighValueItem = useCallback(
    (category) => {
      const id = addPersonalPropertyItem(category, true);
      setFocusItemId(id);
      setExpandedCategories((prev) => ({ ...prev, [category]: true }));
      setReminderShown((prev) => ({ ...prev, [category]: true }));
    },
    [addPersonalPropertyItem]
  );

  const handleRemoveItem = useCallback(
    (item, isHighValue) => {
      const label = item.description ? item.description : 'this item';
      if (window.confirm(`Remove ${label}?`)) {
        removePersonalPropertyItem(item.id, isHighValue);
      }
    },
    [removePersonalPropertyItem]
  );

  const handleCategoryToggle = useCallback((category) => {
    setExpandedCategories((prev) => {
      const opening = !prev[category];
      if (opening) {
        setReminderShown((prevR) => ({ ...prevR, [category]: true }));
      }
      return { ...prev, [category]: opening };
    });
  }, []);

  const handleToggleItemDetails = useCallback((itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  }, []);

  const handleReset = useCallback(() => {
    const msg =
      'This will clear all entries in the Personal Property Inventory. You will start with a blank inventory. Are you sure?';
    if (window.confirm(msg)) {
      resetPersonalPropertyInventory();
      initPersonalProperty();
      setExpandedItems({});
      setExpandedCategories({});
      setReminderShown({});
      setSelectedRoomIndex(0);
    }
  }, [resetPersonalPropertyInventory, initPersonalProperty]);

  const handleValueKeyDown = useCallback(
    (e, context) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (context.isHighValue) handleAddHighValueItem(context.category);
        else handleAddRoomItem();
      }
    },
    [handleAddHighValueItem, handleAddRoomItem]
  );

  const handleWhoKeepsKeyDown = useCallback(
    (e, currentValue, itemId, isHighValue) => {
      const options = WHO_KEEPS_OPTIONS;
      const currentIdx = options.findIndex((o) => o.value === currentValue);
      if (currentIdx === -1) return;
      let newIdx = currentIdx;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        newIdx = (currentIdx + 1) % options.length;
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        newIdx = (currentIdx - 1 + options.length) % options.length;
        e.preventDefault();
      } else {
        return;
      }
      if (newIdx !== currentIdx) {
        updatePersonalPropertyItem(
          itemId,
          { whoKeeps: options[newIdx].value },
          isHighValue
        );
        requestAnimationFrame(() => {
          const btn = document.querySelector(
            `[data-wk-item="${itemId}"][data-wk-value="${options[newIdx].value}"]`
          );
          if (btn) btn.focus();
        });
      }
    },
    [updatePersonalPropertyItem]
  );

  // ─── Derived ─────────────────────────────────────────────────────────────────
  const allItems = [
    ...rooms.flatMap((r) => r.items),
    ...highValueItems,
  ];
  const totalItems = summary.totalItems;
  const undecidedCount = allItems.filter((i) => i.whoKeeps === 'undecided')
    .length;
  const inventoryIsEmpty =
    rooms.length === 0 && highValueItems.length === 0;

  const itemCountByStatus = {
    self: allItems.filter((i) => i.whoKeeps === 'self').length,
    spouse: allItems.filter((i) => i.whoKeeps === 'spouse').length,
    disputed: allItems.filter((i) => i.whoKeeps === 'disputed').length,
    undecided: undecidedCount,
  };

  // ─── Render helpers ──────────────────────────────────────────────────────────
  const renderWhoKeepsControl = (item, isHighValue) => {
    if (isMobile) {
      return (
        <div style={{ marginTop: 12 }}>
          <label
            htmlFor={`wk-${item.id}`}
            style={{
              display: 'block',
              fontFamily: SOURCE,
              fontSize: 13,
              color: NAVY_70,
              marginBottom: 4,
            }}
          >
            Who Keeps
          </label>
          <select
            id={`wk-${item.id}`}
            value={item.whoKeeps}
            onChange={(e) =>
              updatePersonalPropertyItem(
                item.id,
                { whoKeeps: e.target.value },
                isHighValue
              )
            }
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 12px',
              fontFamily: SOURCE,
              fontSize: 15,
              color: NAVY,
              backgroundColor: WHITE,
              border: `1px solid ${NAVY_30}`,
              borderRadius: 4,
            }}
          >
            <option value="self">You</option>
            <option value="spouse">Spouse</option>
            <option value="disputed">Disputed</option>
            <option value="undecided">Undecided</option>
          </select>
        </div>
      );
    }
    return (
      <div style={{ marginTop: 12 }}>
        <div
          id={`wk-label-${item.id}`}
          style={{
            fontFamily: SOURCE,
            fontSize: 13,
            color: NAVY_70,
            marginBottom: 4,
          }}
        >
          Who Keeps
        </div>
        <div
          role="radiogroup"
          aria-labelledby={`wk-label-${item.id}`}
          style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
        >
          {WHO_KEEPS_OPTIONS.map((opt) => {
            const selected = item.whoKeeps === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                tabIndex={selected ? 0 : -1}
                data-wk-item={item.id}
                data-wk-value={opt.value}
                onClick={() =>
                  updatePersonalPropertyItem(
                    item.id,
                    { whoKeeps: opt.value },
                    isHighValue
                  )
                }
                onKeyDown={(e) =>
                  handleWhoKeepsKeyDown(e, item.whoKeeps, item.id, isHighValue)
                }
                style={{
                  minHeight: 44,
                  minWidth: 44,
                  padding: '8px 14px',
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: selected ? opt.bg : WHITE,
                  color: selected ? opt.fg : NAVY_70,
                  border: `1px solid ${selected ? opt.bg : NAVY_30}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPurchasedControl = (item, isHighValue) => (
    <div style={{ marginTop: 12 }}>
      <div
        id={`pur-label-${item.id}`}
        style={{
          fontFamily: SOURCE,
          fontSize: 13,
          color: NAVY_70,
          marginBottom: 4,
        }}
      >
        Purchased During Marriage
      </div>
      <div
        role="radiogroup"
        aria-labelledby={`pur-label-${item.id}`}
        style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}
      >
        {PURCHASED_OPTIONS.map((opt) => {
          const selected = item.purchasedDuringMarriage === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() =>
                updatePersonalPropertyItem(
                  item.id,
                  { purchasedDuringMarriage: opt.value },
                  isHighValue
                )
              }
              style={{
                minHeight: 44,
                minWidth: 44,
                padding: '8px 14px',
                fontFamily: SOURCE,
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: selected ? NAVY : WHITE,
                color: selected ? WHITE : NAVY_70,
                border: `1px solid ${selected ? NAVY : NAVY_30}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderItemRow = (item, isHighValue, categoryForEnter) => {
    const isExpanded = !!expandedItems[item.id];
    return (
      <div
        key={item.id}
        style={{
          backgroundColor: WHITE,
          border: `1px solid ${NAVY_20}`,
          borderRadius: 6,
          padding: 12,
          marginBottom: 8,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: 8,
            alignItems: isMobile ? 'stretch' : 'center',
          }}
        >
          <div style={{ flex: '1 1 auto', minWidth: 0 }}>
            <label htmlFor={`desc-${item.id}`} style={srOnly}>
              Description
            </label>
            <input
              id={`desc-${item.id}`}
              ref={(el) => {
                if (el) descriptionRefs.current[item.id] = el;
              }}
              type="text"
              placeholder="Description"
              value={item.description}
              onChange={(e) =>
                updatePersonalPropertyItem(
                  item.id,
                  { description: e.target.value },
                  isHighValue
                )
              }
              style={{
                width: '100%',
                minHeight: 44,
                padding: '10px 12px',
                fontFamily: SOURCE,
                fontSize: 15,
                color: NAVY,
                backgroundColor: WHITE,
                border: `1px solid ${NAVY_20}`,
                borderRadius: 4,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div
            style={{
              flex: '0 0 auto',
              width: isMobile ? '100%' : 160,
            }}
          >
            <label htmlFor={`val-${item.id}`} style={srOnly}>
              Current Value
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontFamily: SOURCE,
                  fontSize: 15,
                  fontWeight: 600,
                  color: NAVY_70,
                  pointerEvents: 'none',
                }}
              >
                $
              </span>
              <input
                id={`val-${item.id}`}
                type="number"
                inputMode="decimal"
                placeholder="0"
                value={item.currentValue || ''}
                onChange={(e) =>
                  updatePersonalPropertyItem(
                    item.id,
                    { currentValue: Number(e.target.value) || 0 },
                    isHighValue
                  )
                }
                onKeyDown={(e) =>
                  handleValueKeyDown(e, {
                    isHighValue,
                    category: categoryForEnter,
                  })
                }
                style={{
                  width: '100%',
                  minHeight: 44,
                  padding: '10px 12px 10px 24px',
                  fontFamily: SOURCE,
                  fontSize: 15,
                  fontWeight: 600,
                  color: NAVY,
                  backgroundColor: WHITE,
                  border: `1px solid ${NAVY_20}`,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flex: '0 0 auto' }}>
            <button
              type="button"
              onClick={() => handleToggleItemDetails(item.id)}
              aria-expanded={isExpanded}
              aria-label={`Toggle details for ${
                item.description || 'item'
              }`}
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: '8px 10px',
                fontFamily: SOURCE,
                fontSize: 13,
                color: NAVY_70,
                backgroundColor: 'transparent',
                border: `1px solid ${NAVY_20}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              {isExpanded ? '− More details' : '+ More details'}
            </button>
            <button
              type="button"
              onClick={() => handleRemoveItem(item, isHighValue)}
              aria-label={`Remove ${item.description || 'item'}`}
              style={{
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                fontFamily: SOURCE,
                fontSize: 20,
                lineHeight: 1,
                color: SHORTFALL_RED,
                backgroundColor: 'transparent',
                border: `1px solid ${NAVY_20}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </div>

        {isExpanded && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${NAVY_20}`,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isDesktop ? '1fr 1fr' : '1fr',
                gap: 12,
              }}
            >
              <div>
                <label
                  htmlFor={`sn-${item.id}`}
                  style={{
                    display: 'block',
                    fontFamily: SOURCE,
                    fontSize: 13,
                    color: NAVY_70,
                    marginBottom: 4,
                  }}
                >
                  Serial Number
                </label>
                <input
                  id={`sn-${item.id}`}
                  type="text"
                  value={item.serialNumber || ''}
                  onChange={(e) =>
                    updatePersonalPropertyItem(
                      item.id,
                      { serialNumber: e.target.value || null },
                      isHighValue
                    )
                  }
                  style={{
                    width: '100%',
                    minHeight: 44,
                    padding: '10px 12px',
                    fontFamily: SOURCE,
                    fontSize: 15,
                    color: NAVY,
                    backgroundColor: WHITE,
                    border: `1px solid ${NAVY_20}`,
                    borderRadius: 4,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  htmlFor={`qty-${item.id}`}
                  style={{
                    display: 'block',
                    fontFamily: SOURCE,
                    fontSize: 13,
                    color: NAVY_70,
                    marginBottom: 4,
                  }}
                >
                  Quantity
                </label>
                <input
                  id={`qty-${item.id}`}
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) =>
                    updatePersonalPropertyItem(
                      item.id,
                      {
                        quantity: Math.max(1, Number(e.target.value) || 1),
                      },
                      isHighValue
                    )
                  }
                  style={{
                    width: '100%',
                    minHeight: 44,
                    padding: '10px 12px',
                    fontFamily: SOURCE,
                    fontSize: 15,
                    color: NAVY,
                    backgroundColor: WHITE,
                    border: `1px solid ${NAVY_20}`,
                    borderRadius: 4,
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>

            {renderPurchasedControl(item, isHighValue)}
            {renderWhoKeepsControl(item, isHighValue)}

            <div style={{ marginTop: 12 }}>
              <label
                htmlFor={`notes-${item.id}`}
                style={{
                  display: 'block',
                  fontFamily: SOURCE,
                  fontSize: 13,
                  color: NAVY_70,
                  marginBottom: 4,
                }}
              >
                Notes
              </label>
              <textarea
                id={`notes-${item.id}`}
                rows={2}
                value={item.notes}
                onChange={(e) =>
                  updatePersonalPropertyItem(
                    item.id,
                    { notes: e.target.value },
                    isHighValue
                  )
                }
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  fontFamily: SOURCE,
                  fontSize: 15,
                  color: NAVY,
                  backgroundColor: WHITE,
                  border: `1px solid ${NAVY_20}`,
                  borderRadius: 4,
                  boxSizing: 'border-box',
                  resize: 'vertical',
                }}
              />
            </div>
          </div>
        )}

        {isHighValue &&
          item.appraisalFlagged &&
          APPRAISAL_PROMPTS[item.location] && (
            <div
              style={{
                marginTop: 8,
                backgroundColor: PARCHMENT,
                borderLeft: `3px solid ${GOLD}`,
                padding: '12px 16px',
                fontFamily: SOURCE,
                fontSize: 14,
                color: NAVY,
              }}
            >
              {APPRAISAL_PROMPTS[item.location]}
            </div>
          )}
      </div>
    );
  };

  const renderRoomSidebar = () => {
    if (isMobile) {
      return (
        <div style={{ marginBottom: 16 }}>
          <label
            htmlFor="room-select"
            style={{
              display: 'block',
              fontFamily: SOURCE,
              fontSize: 13,
              color: NAVY_70,
              marginBottom: 4,
            }}
          >
            Room
          </label>
          <select
            id="room-select"
            value={selectedRoomIndex}
            onChange={(e) => setSelectedRoomIndex(Number(e.target.value))}
            style={{
              width: '100%',
              minHeight: 44,
              padding: '10px 12px',
              fontFamily: SOURCE,
              fontSize: 15,
              color: NAVY,
              backgroundColor: WHITE,
              border: `1px solid ${NAVY_30}`,
              borderRadius: 4,
            }}
          >
            {rooms.map((room, idx) => {
              const itemCount = room.items.length;
              const roomTotal = room.items.reduce(
                (s, i) => s + (Number(i.currentValue) || 0),
                0
              );
              return (
                <option key={`${room.name}-${idx}`} value={idx}>
                  {room.name} ({itemCount}{' '}
                  {itemCount === 1 ? 'item' : 'items'}, {fmtMoney(roomTotal)})
                </option>
              );
            })}
          </select>
          <button
            type="button"
            onClick={handleAddRoom}
            style={{
              marginTop: 8,
              minHeight: 44,
              padding: '10px 14px',
              fontFamily: SOURCE,
              fontSize: 14,
              fontWeight: 600,
              color: NAVY,
              backgroundColor: WHITE,
              border: `1px dashed ${NAVY_50}`,
              borderRadius: 4,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + Add Room
          </button>
        </div>
      );
    }
    return (
      <div
        role="tablist"
        aria-label="Rooms"
        style={{
          width: 200,
          flex: '0 0 200px',
          borderRight: `1px solid ${NAVY_20}`,
          paddingRight: 16,
        }}
      >
        {rooms.map((room, idx) => {
          const itemCount = room.items.length;
          const roomTotal = room.items.reduce(
            (s, i) => s + (Number(i.currentValue) || 0),
            0
          );
          const selected = selectedRoomIndex === idx;
          return (
            <div
              key={`${room.name}-${idx}`}
              style={{
                display: 'flex',
                alignItems: 'stretch',
                marginBottom: 4,
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setSelectedRoomIndex(idx)}
                style={{
                  flex: '1 1 auto',
                  textAlign: 'left',
                  padding: '10px 12px',
                  minHeight: 44,
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: selected ? 600 : 400,
                  color: NAVY,
                  backgroundColor: selected ? PARCHMENT : 'transparent',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                <div>{room.name}</div>
                <div
                  style={{
                    fontSize: 12,
                    color: NAVY_60,
                    marginTop: 2,
                  }}
                >
                  {itemCount} {itemCount === 1 ? 'item' : 'items'} ·{' '}
                  {fmtMoney(roomTotal)}
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRemoveRoom(idx)}
                aria-label={`Remove ${room.name}`}
                style={{
                  width: 44,
                  minHeight: 44,
                  padding: 0,
                  fontFamily: SOURCE,
                  fontSize: 18,
                  color: NAVY_50,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                ×
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={handleAddRoom}
          style={{
            width: '100%',
            marginTop: 8,
            minHeight: 44,
            padding: '10px 12px',
            fontFamily: SOURCE,
            fontSize: 14,
            fontWeight: 600,
            color: NAVY,
            backgroundColor: WHITE,
            border: `1px dashed ${NAVY_50}`,
            borderRadius: 4,
            cursor: 'pointer',
          }}
        >
          + Add Room
        </button>
      </div>
    );
  };

  const renderRoomTab = () => {
    const currentRoom = rooms[selectedRoomIndex];
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {renderRoomSidebar()}
        <div
          style={{
            flex: '1 1 auto',
            maxWidth: 960,
            minWidth: 0,
            width: '100%',
          }}
        >
          {currentRoom ? (
            <>
              <h3
                style={{
                  fontFamily: PLAYFAIR,
                  fontSize: 20,
                  color: NAVY,
                  margin: '0 0 12px 0',
                }}
              >
                {currentRoom.name}
              </h3>
              {currentRoom.items.length === 0 ? (
                <p
                  style={{
                    fontFamily: SOURCE,
                    fontSize: 15,
                    color: NAVY_60,
                    margin: '12px 0',
                  }}
                >
                  No items yet. Add your first item below.
                </p>
              ) : (
                currentRoom.items.map((item) =>
                  renderItemRow(item, false, null)
                )
              )}
              <button
                type="button"
                onClick={handleAddRoomItem}
                style={{
                  marginTop: 8,
                  minHeight: 44,
                  width: '100%',
                  padding: '12px 16px',
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 600,
                  color: NAVY,
                  backgroundColor: WHITE,
                  border: `1px dashed ${NAVY_50}`,
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                + Add item
              </button>
            </>
          ) : (
            <p
              style={{
                fontFamily: SOURCE,
                fontSize: 16,
                color: NAVY_60,
              }}
            >
              Add your first room to start.
            </p>
          )}
        </div>
      </div>
    );
  };

  const renderHighValueTab = () => (
    <div style={{ maxWidth: 960, margin: '0 auto', width: '100%' }}>
      {HIGH_VALUE_CATEGORIES.map((category) => {
        const categoryItems = highValueItems.filter(
          (i) => i.location === category
        );
        const isExpanded = !!expandedCategories[category];
        const categoryTotal = categoryItems.reduce(
          (s, i) => s + (Number(i.currentValue) || 0),
          0
        );
        const showReminder = isExpanded && reminderShown[category];

        return (
          <div
            key={category}
            style={{
              marginBottom: 12,
              border: `1px solid ${NAVY_20}`,
              borderRadius: 6,
              backgroundColor: WHITE,
              overflow: 'visible',
            }}
          >
            <button
              type="button"
              onClick={() => handleCategoryToggle(category)}
              aria-expanded={isExpanded}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                minHeight: 44,
                padding: '14px 16px',
                fontFamily: PLAYFAIR,
                fontSize: 20,
                color: NAVY,
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <span>{category}</span>
              <span
                style={{
                  fontFamily: SOURCE,
                  fontSize: 14,
                  fontWeight: 400,
                  color: NAVY_70,
                }}
              >
                {categoryItems.length}{' '}
                {categoryItems.length === 1 ? 'item' : 'items'} ·{' '}
                {fmtMoney(categoryTotal)} {isExpanded ? '−' : '+'}
              </span>
            </button>
            {isExpanded && (
              <div
                style={{ padding: '0 16px 16px 16px', overflow: 'visible' }}
              >
                {showReminder && (
                  <div
                    style={{
                      backgroundColor: PARCHMENT,
                      borderLeft: `3px solid ${GOLD}`,
                      padding: '12px 16px',
                      marginBottom: 12,
                      fontFamily: SOURCE,
                      fontSize: 14,
                      color: NAVY,
                    }}
                  >
                    If you already listed this item in a room inventory,
                    remove it there to avoid counting it twice.
                  </div>
                )}
                {categoryItems.length === 0 ? (
                  <p
                    style={{
                      fontFamily: SOURCE,
                      fontSize: 15,
                      color: NAVY_60,
                      margin: '8px 0',
                    }}
                  >
                    No items yet. Add your first item below.
                  </p>
                ) : (
                  categoryItems.map((item) =>
                    renderItemRow(item, true, category)
                  )
                )}
                <button
                  type="button"
                  onClick={() => handleAddHighValueItem(category)}
                  style={{
                    marginTop: 8,
                    minHeight: 44,
                    width: '100%',
                    padding: '12px 16px',
                    fontFamily: SOURCE,
                    fontSize: 14,
                    fontWeight: 600,
                    color: NAVY,
                    backgroundColor: WHITE,
                    border: `1px dashed ${NAVY_50}`,
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  + Add item to {category}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  // Single row, four stacked segments
  const chartData = [
    {
      name: 'Division',
      self: summary.clientValue,
      spouse: summary.spouseValue,
      disputed: summary.disputedValue,
      undecided: summary.undecidedValue,
    },
  ];

  const chartLabels = {
    self: 'You keep',
    spouse: 'Spouse keeps',
    disputed: 'Disputed',
    undecided: 'Undecided',
  };

  const renderDivisionSummary = () => (
    <div
      style={{
        maxWidth: 960,
        margin: '32px auto 0',
        padding: '0 20px',
      }}
    >
      <h3
        style={{
          fontFamily: PLAYFAIR,
          fontSize: 22,
          color: NAVY,
          margin: '0 0 16px 0',
        }}
      >
        Division Summary
      </h3>
      {summary.totalValue === 0 ? (
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 15,
            color: NAVY_60,
          }}
        >
          No items valued yet
        </p>
      ) : (
        <>
          <div style={{ width: '100%', height: 80 }} aria-hidden="true">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip
                  formatter={(value, name) => [
                    fmtMoney(value),
                    chartLabels[name] || name,
                  ]}
                />
                <Bar dataKey="self" stackId="a" fill={SURPLUS_GREEN}>
                  <Cell fill={SURPLUS_GREEN} />
                </Bar>
                <Bar dataKey="spouse" stackId="a" fill={NAVY}>
                  <Cell fill={NAVY} />
                </Bar>
                <Bar dataKey="disputed" stackId="a" fill={SHORTFALL_RED}>
                  <Cell fill={SHORTFALL_RED} />
                </Bar>
                <Bar dataKey="undecided" stackId="a" fill={NAVY_30}>
                  <Cell fill={NAVY_30} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: isMobile ? 8 : 12,
              marginTop: 8,
              fontFamily: SOURCE,
              fontSize: isMobile ? 12 : 13,
              color: NAVY_70,
            }}
            aria-hidden="true"
          >
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: SURPLUS_GREEN,
                  marginRight: 4,
                }}
              />
              You keep
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: NAVY,
                  marginRight: 4,
                }}
              />
              Spouse keeps
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: SHORTFALL_RED,
                  marginRight: 4,
                }}
              />
              Disputed
            </span>
            <span>
              <span
                style={{
                  display: 'inline-block',
                  width: 10,
                  height: 10,
                  backgroundColor: NAVY_30,
                  marginRight: 4,
                }}
              />
              Undecided
            </span>
          </div>
        </>
      )}

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table
        style={{
          marginTop: 16,
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: SOURCE,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: 'left',
                padding: isMobile ? '8px 6px' : '8px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: NAVY_70,
                borderBottom: `1px solid ${NAVY_20}`,
              }}
            >
              Status
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: isMobile ? '8px 6px' : '8px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: NAVY_70,
                borderBottom: `1px solid ${NAVY_20}`,
              }}
            >
              Items
            </th>
            <th
              style={{
                textAlign: 'right',
                padding: isMobile ? '8px 6px' : '8px 12px',
                fontSize: 13,
                fontWeight: 600,
                color: NAVY_70,
                borderBottom: `1px solid ${NAVY_20}`,
              }}
            >
              Total Value
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
              }}
            >
              You keep
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {itemCountByStatus.self}
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {fmtMoney(summary.clientValue)}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
              }}
            >
              Spouse keeps
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {itemCountByStatus.spouse}
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {fmtMoney(summary.spouseValue)}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
              }}
            >
              Disputed
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {itemCountByStatus.disputed}
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {fmtMoney(summary.disputedValue)}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
              }}
            >
              Undecided
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {itemCountByStatus.undecided}
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '10px 12px',
                fontSize: 15,
                fontWeight: 400,
                color: NAVY,
                textAlign: 'right',
              }}
            >
              {fmtMoney(summary.undecidedValue)}
            </td>
          </tr>
          <tr>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '12px',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 600,
                color: NAVY,
                borderTop: `1px solid ${NAVY_30}`,
              }}
            >
              TOTAL
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '12px',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 600,
                color: NAVY,
                textAlign: 'right',
                borderTop: `1px solid ${NAVY_30}`,
              }}
            >
              {summary.totalItems}
            </td>
            <td
              style={{
                padding: isMobile ? '10px 6px' : '12px',
                fontSize: isMobile ? 14 : 16,
                fontWeight: 600,
                color: NAVY,
                textAlign: 'right',
                borderTop: `1px solid ${NAVY_30}`,
                position: 'relative',
              }}
            >
              {fmtMoney(summary.totalValue)}{' '}
              <button
                type="button"
                onClick={() => setShowTooltip((v) => !v)}
                onBlur={() =>
                  setTimeout(() => setShowTooltip(false), 100)
                }
                aria-label="About the total"
                aria-expanded={showTooltip}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 44,
                  height: 44,
                  padding: 0,
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  verticalAlign: 'middle',
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 20,
                    height: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    color: NAVY,
                    border: `1px solid ${NAVY_50}`,
                    borderRadius: '50%',
                  }}
                >
                  ⓘ
                </span>
              </button>
              {showTooltip && (
                <div
                  role="tooltip"
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '100%',
                    marginTop: 4,
                    maxWidth: 280,
                    padding: '10px 12px',
                    backgroundColor: NAVY,
                    color: WHITE,
                    fontFamily: SOURCE,
                    fontSize: 13,
                    fontWeight: 400,
                    borderRadius: 4,
                    zIndex: 10,
                    textAlign: 'left',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                >
                  Make sure items aren&apos;t counted in both a room and a
                  high-value category. If they are, the total will be
                  overstated.
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
      </div>

      {/* Screen reader duplicate */}
      <div style={srOnly}>
        <table>
          <caption>Division Summary by status</caption>
          <thead>
            <tr>
              <th>Status</th>
              <th>Items</th>
              <th>Total Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>You keep</td>
              <td>{itemCountByStatus.self}</td>
              <td>{fmtMoney(summary.clientValue)}</td>
            </tr>
            <tr>
              <td>Spouse keeps</td>
              <td>{itemCountByStatus.spouse}</td>
              <td>{fmtMoney(summary.spouseValue)}</td>
            </tr>
            <tr>
              <td>Disputed</td>
              <td>{itemCountByStatus.disputed}</td>
              <td>{fmtMoney(summary.disputedValue)}</td>
            </tr>
            <tr>
              <td>Undecided</td>
              <td>{itemCountByStatus.undecided}</td>
              <td>{fmtMoney(summary.undecidedValue)}</td>
            </tr>
            <tr>
              <td>Total</td>
              <td>{summary.totalItems}</td>
              <td>{fmtMoney(summary.totalValue)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderCTA = () => {
    let copy;
    let link = null;
    if (totalItems < 10) {
      copy =
        'Keep going — a complete inventory protects your interests and prevents surprises.';
    } else if (undecidedCount > totalItems / 2) {
      copy =
        "You've built a solid list. The next step is deciding who keeps what — or flagging items as 'disputed' for negotiation.";
    } else {
      copy =
        'Your personal property inventory is taking shape. The total feeds into your Marital Estate Inventory — ready to see the full picture?';
      link = (
        <Link
          href="/modules/m2/inventory"
          style={{
            display: 'inline-block',
            marginTop: 12,
            backgroundColor: NAVY,
            color: WHITE,
            fontFamily: SOURCE,
            fontSize: 14,
            fontWeight: 600,
            padding: '11px 22px',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Return to Marital Estate Inventory →
        </Link>
      );
    }
    return (
      <div
        style={{
          maxWidth: 960,
          margin: '20px auto 0',
          padding: '0 20px',
        }}
      >
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 16,
            color: NAVY_70,
            margin: 0,
          }}
        >
          {copy}
        </p>
        {link}
      </div>
    );
  };

  // ─── Main render ─────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        backgroundColor: WHITE,
        width: '100%',
        padding: '32px 20px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 20px' }}>
        <Link
          href="/modules/m2"
          style={{
            color: NAVY,
            textDecoration: 'none',
            fontFamily: SOURCE,
            fontSize: 14,
            opacity: 0.75,
          }}
        >
          ← Back to Know What You Own
        </Link>
      </div>
      {/* Header */}
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <h2
          style={{
            fontFamily: PLAYFAIR,
            fontSize: 28,
            color: NAVY,
            margin: '0 0 8px 0',
          }}
        >
          Personal Property Inventory
        </h2>
        <p
          style={{
            fontFamily: SOURCE,
            fontSize: 16,
            color: NAVY_70,
            margin: '0 0 20px 0',
          }}
        >
          Go room by room through your household and catalog what&apos;s
          there.
        </p>
        <div
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY,
            backgroundColor: PARCHMENT,
            borderLeft: `3px solid ${GOLD}`,
            padding: 16,
            marginBottom: 24,
          }}
        >
          For most household items, the standard is &quot;garage sale
          value&quot; — what you could reasonably sell the item for today, not
          what you paid for it. Exceptions: vehicles (use Kelley Blue Book or
          similar), jewelry and watches (get an appraisal for items over
          $1,000), art and antiques (get an appraisal for items over $2,500),
          and collections (get an appraisal if total collection value exceeds
          $5,000).
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          maxWidth: 960,
          margin: '0 auto 24px',
          borderBottom: `1px solid ${NAVY_20}`,
          padding: '0 20px',
        }}
      >
        <div
          role="tablist"
          aria-label="Inventory views"
          style={{ display: 'flex', gap: 24 }}
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rooms'}
            onClick={() => setActiveTab('rooms')}
            style={{
              padding: '12px 0',
              minHeight: 44,
              fontFamily: SOURCE,
              fontSize: 15,
              fontWeight: 600,
              color: activeTab === 'rooms' ? NAVY : NAVY_50,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'rooms'
                  ? `3px solid ${GOLD}`
                  : '3px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
            }}
          >
            Room by Room
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'highValue'}
            onClick={() => setActiveTab('highValue')}
            style={{
              padding: '12px 0',
              minHeight: 44,
              fontFamily: SOURCE,
              fontSize: 15,
              fontWeight: 600,
              color: activeTab === 'highValue' ? NAVY : NAVY_50,
              backgroundColor: 'transparent',
              border: 'none',
              borderBottom:
                activeTab === 'highValue'
                  ? `3px solid ${GOLD}`
                  : '3px solid transparent',
              marginBottom: -1,
              cursor: 'pointer',
            }}
          >
            High-Value Items
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 20px',
        }}
      >
        {inventoryIsEmpty ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p
              style={{
                fontFamily: SOURCE,
                fontSize: 16,
                color: NAVY_60,
                margin: '0 0 16px 0',
              }}
            >
              Add your first room to start.
            </p>
            <button
              type="button"
              onClick={handleAddRoom}
              style={{
                minHeight: 44,
                padding: '12px 20px',
                fontFamily: SOURCE,
                fontSize: 14,
                fontWeight: 600,
                color: NAVY,
                backgroundColor: WHITE,
                border: `1px dashed ${NAVY_50}`,
                borderRadius: 4,
                cursor: 'pointer',
              }}
            >
              + Add Room
            </button>
          </div>
        ) : activeTab === 'rooms' ? (
          renderRoomTab()
        ) : (
          renderHighValueTab()
        )}
      </div>

      {/* Division Summary */}
      {renderDivisionSummary()}

      {/* CTA */}
      {renderCTA()}

      {/* Reset link */}
      <div
        style={{
          maxWidth: 960,
          margin: '24px auto 0',
          padding: '0 20px',
          textAlign: 'center',
        }}
      >
        <button
          type="button"
          onClick={handleReset}
          style={{
            fontFamily: SOURCE,
            fontSize: 14,
            color: NAVY_50,
            textDecoration: 'underline',
            backgroundColor: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Start over
        </button>
      </div>

      {/* Disclaimer */}
      <p
        style={{
          fontFamily: SOURCE,
          fontSize: 12,
          color: NAVY_60,
          maxWidth: 960,
          margin: '0 auto',
          padding: '24px 20px',
        }}
      >
        This inventory is for organizational and planning purposes only.
        Estimated values are approximations and should not be relied upon for
        legal or settlement purposes. High-value items should be professionally
        appraised. This tool does not constitute financial, legal, or tax
        advice. For guidance specific to your situation, consult a Certified
        Divorce Financial Analyst® or attorney.
      </p>
    </div>
  );
}
