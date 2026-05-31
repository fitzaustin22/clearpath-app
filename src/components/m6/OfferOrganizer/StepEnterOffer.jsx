'use client';

/**
 * Screen 1 — Enter the Offer. Record only the terms the offer actually states;
 * what's left blank is part of the picture (it surfaces as a neutral gap later).
 * Every field writes straight to the store (setOfferField / addAssetItem /
 * addDebtItem). `note` fields are private — in-tool only, never to the Blueprint.
 *
 * Choice values are stored verbatim as their display labels (the user's own
 * selection), so the §11 readout and Review render them with no tool transform.
 */

import { useState } from 'react';
import { T } from '@/src/lib/brand/tokens';
import { useM6Store } from '@/src/stores/m6Store';
import WizardRadio from '@/src/components/wizard/WizardRadio';
import { OFFER_COPY } from './copy';
import { PrimaryButton, SecondaryButton, FieldLabel, inputStyle } from './ui';

const toNum = (v) => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const sectionStyle = { borderTop: `1px solid ${T.LINE}`, paddingTop: 20, marginTop: 20 };
const helpStyle = { fontFamily: T.FONT_BODY, fontSize: 13, color: T.INK_2, margin: '0 0 10px 0' };

function NoteField({ value, onChange }) {
  const c = OFFER_COPY.enter;
  const [open, setOpen] = useState(Boolean(value));
  return (
    <div style={{ marginTop: 8 }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{ background: 'transparent', border: 'none', color: T.NAVY_55, fontFamily: T.FONT_BODY, fontSize: 13, cursor: 'pointer', padding: 0 }}
      >
        {c.noteToggle}
      </button>
      {open && (
        <input
          aria-label={c.noteToggle}
          value={value || ''}
          placeholder={c.notePlaceholder}
          maxLength={140}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...inputStyle, marginTop: 6 }}
        />
      )}
    </div>
  );
}

function ToUserRadio({ field, value, onChange }) {
  const c = OFFER_COPY.enter;
  return (
    <WizardRadio
      field={field}
      legend={c.toUserLabel}
      legendHidden
      variant="segmented"
      value={value || ''}
      onChange={(_f, v) => onChange(v)}
      options={[
        { value: c.toUser.you, label: c.toUser.you },
        { value: c.toUser.spouse, label: c.toUser.spouse },
        { value: c.toUser.shared, label: c.toUser.shared },
      ]}
    />
  );
}

export default function StepEnterOffer({ onNext, onBack }) {
  const c = OFFER_COPY.enter;
  const offer = useM6Store((s) => s.offerOrganizer.offer);
  const setOfferField = useM6Store((s) => s.setOfferField);
  const addAssetItem = useM6Store((s) => s.addAssetItem);
  const removeAssetItem = useM6Store((s) => s.removeAssetItem);
  const addDebtItem = useM6Store((s) => s.addDebtItem);
  const removeDebtItem = useM6Store((s) => s.removeDebtItem);

  const assets = offer?.assetItems ?? [];
  const debts = offer?.debts ?? [];

  const [assetDraft, setAssetDraft] = useState({ label: '', toUser: '', note: '' });
  const [debtDraft, setDebtDraft] = useState({ label: '', toUser: '' });

  const addAsset = () => {
    if (!assetDraft.label.trim()) return;
    addAssetItem(assetDraft);
    setAssetDraft({ label: '', toUser: '', note: '' });
  };
  const addDebt = () => {
    if (!debtDraft.label.trim()) return;
    addDebtItem(debtDraft);
    setDebtDraft({ label: '', toUser: '' });
  };

  return (
    <div data-testid="offer-organizer-step-enter">
      <h2 style={{ fontFamily: T.FONT_DISPLAY, fontWeight: 700, fontSize: 24, color: T.NAVY, margin: '0 0 8px 0' }}>
        {c.title}
      </h2>
      <p style={{ fontFamily: T.FONT_BODY, fontSize: 15, lineHeight: 1.55, color: T.INK_2, margin: '0 0 8px 0' }}>
        {c.subhead}
      </p>

      {/* Assets */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.assets}</FieldLabel>
        {assets.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 12px 0', padding: 0 }}>
            {assets.map((a) => (
              <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>
                  {a.label}
                  {a.toUser ? <span style={{ color: T.NAVY_55 }}> — {a.toUser}</span> : null}
                </span>
                <SecondaryButton onClick={() => removeAssetItem(a.id)}>{OFFER_COPY.common.remove}</SecondaryButton>
              </li>
            ))}
          </ul>
        )}
        <input
          data-testid="offer-asset-input"
          aria-label={c.sections.assets}
          value={assetDraft.label}
          placeholder={c.assetPlaceholder}
          onChange={(e) => setAssetDraft((d) => ({ ...d, label: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addAsset();
            }
          }}
          style={inputStyle}
        />
        <div style={{ marginTop: 10 }}>
          <ToUserRadio field="asset-touser" value={assetDraft.toUser} onChange={(v) => setAssetDraft((d) => ({ ...d, toUser: v }))} />
        </div>
        <NoteField value={assetDraft.note} onChange={(v) => setAssetDraft((d) => ({ ...d, note: v }))} />
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            data-testid="offer-asset-add"
            onClick={addAsset}
            style={{ backgroundColor: T.GOLD_TINT, color: T.PILL_TEXT, fontFamily: T.FONT_BODY, fontWeight: 600, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.GOLD_BORDER}`, cursor: 'pointer' }}
          >
            {OFFER_COPY.common.add}
          </button>
        </div>
      </section>

      {/* Support */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.support}</FieldLabel>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={helpStyle}>{c.support.amount}</p>
            <input
              aria-label={c.support.amount}
              type="number"
              value={offer?.support?.amount ?? ''}
              onChange={(e) => setOfferField('support.amount', toNum(e.target.value))}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <p style={helpStyle}>{c.support.duration}</p>
            <input
              aria-label={c.support.duration}
              type="number"
              value={offer?.support?.durationMonths ?? ''}
              onChange={(e) => setOfferField('support.durationMonths', toNum(e.target.value))}
              style={inputStyle}
            />
          </div>
        </div>
        <p style={helpStyle}>{c.support.kind}</p>
        <WizardRadio
          field="support-kind"
          legend={c.support.kind}
          legendHidden
          variant="segmented"
          value={offer?.support?.kind || ''}
          onChange={(_f, v) => setOfferField('support.kind', v)}
          options={[
            { value: c.support.kinds.spousal, label: c.support.kinds.spousal },
            { value: c.support.kinds.child, label: c.support.kinds.child },
            { value: c.support.kinds.combined, label: c.support.kinds.combined },
          ]}
        />
      </section>

      {/* The home */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.home}</FieldLabel>
        <WizardRadio
          field="residence-disposition"
          legend={c.home.label}
          variant="segmented"
          value={offer?.residence?.disposition || ''}
          onChange={(_f, v) => setOfferField('residence.disposition', v)}
          options={[
            { value: c.home.options.keep, label: c.home.options.keep },
            { value: c.home.options.sell, label: c.home.options.sell },
            { value: c.home.options.buyout, label: c.home.options.buyout },
            { value: c.home.options.transfer, label: c.home.options.transfer },
          ]}
        />
        <NoteField value={offer?.residence?.note} onChange={(v) => setOfferField('residence.note', v)} />
      </section>

      {/* Retirement */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.retirement}</FieldLabel>
        <p style={helpStyle}>{c.retirementLabel}</p>
        <input
          aria-label={c.retirementLabel}
          type="number"
          value={offer?.retirement?.divisionPct ?? ''}
          onChange={(e) => setOfferField('retirement.divisionPct', toNum(e.target.value))}
          style={inputStyle}
        />
        <NoteField value={offer?.retirement?.note} onChange={(v) => setOfferField('retirement.note', v)} />
      </section>

      {/* Debts */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.debts}</FieldLabel>
        {debts.length > 0 && (
          <ul style={{ listStyle: 'none', margin: '0 0 12px 0', padding: 0 }}>
            {debts.map((d) => (
              <li key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontFamily: T.FONT_BODY, fontSize: 15, color: T.INK }}>
                  {d.label}
                  {d.toUser ? <span style={{ color: T.NAVY_55 }}> — {d.toUser}</span> : null}
                </span>
                <SecondaryButton onClick={() => removeDebtItem(d.id)}>{OFFER_COPY.common.remove}</SecondaryButton>
              </li>
            ))}
          </ul>
        )}
        <input
          data-testid="offer-debt-input"
          aria-label={c.sections.debts}
          value={debtDraft.label}
          placeholder={c.debtPlaceholder}
          onChange={(e) => setDebtDraft((d) => ({ ...d, label: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addDebt();
            }
          }}
          style={inputStyle}
        />
        <div style={{ marginTop: 10 }}>
          <ToUserRadio field="debt-touser" value={debtDraft.toUser} onChange={(v) => setDebtDraft((d) => ({ ...d, toUser: v }))} />
        </div>
        <div style={{ marginTop: 10 }}>
          <button
            type="button"
            data-testid="offer-debt-add"
            onClick={addDebt}
            style={{ backgroundColor: T.GOLD_TINT, color: T.PILL_TEXT, fontFamily: T.FONT_BODY, fontWeight: 600, fontSize: 13, padding: '8px 16px', borderRadius: 8, border: `1px solid ${T.GOLD_BORDER}`, cursor: 'pointer' }}
          >
            {OFFER_COPY.common.add}
          </button>
        </div>
      </section>

      {/* Anything else */}
      <section style={sectionStyle}>
        <FieldLabel>{c.sections.other}</FieldLabel>
        <textarea
          aria-label={c.sections.other}
          value={offer?.otherTerms ?? ''}
          placeholder={c.otherPlaceholder}
          onChange={(e) => setOfferField('otherTerms', e.target.value)}
          rows={3}
          style={{ ...inputStyle, resize: 'vertical' }}
        />
      </section>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
        <SecondaryButton onClick={onBack}>{OFFER_COPY.common.back}</SecondaryButton>
        <PrimaryButton onClick={onNext}>{c.continue}</PrimaryButton>
      </div>
    </div>
  );
}
