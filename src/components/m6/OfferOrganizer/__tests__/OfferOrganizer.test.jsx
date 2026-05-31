/**
 * OfferOrganizer — entry + wizard wiring tests (M6 Tool 3).
 *
 * Gates exactly like the M6 landing and the sibling tools: Free / Essentials see
 * the locked teaser; Full Access (navigator/signature) runs the four-step wizard
 * (Framing → Enter the Offer → Map to Priorities → Review & Save). The tool never
 * auto-writes: the Blueprint write happens only on the explicit "Save to my
 * Blueprint" click. The Map step is the ONLY place addressed/silent is decided —
 * by the user, never tool inference.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OfferOrganizer from '../OfferOrganizer';
import { OFFER_COPY, OFFER_DISCLAIMER } from '../copy';
import { useM6Store } from '@/src/stores/m6Store';
import useBlueprintStore from '@/src/stores/blueprintStore';

function seedPriority(item, importance = 'must-have') {
  useM6Store.getState().addPriority({ item });
  const items = useM6Store.getState().priorities.items;
  useM6Store.getState().setPriorityImportance(items[items.length - 1].id, importance);
}

beforeEach(() => {
  localStorage.clear();
  useM6Store.getState().resetOffer();
  useM6Store.getState().resetPriorities();
  useBlueprintStore.getState().resetBlueprint();
});

describe('OfferOrganizer — tier gating', () => {
  it.each(['free', 'essentials'])('%s tier sees the locked teaser, not the wizard', (tier) => {
    render(<OfferOrganizer userTier={tier} />);
    expect(screen.getByTestId('offer-organizer-locked-teaser')).toBeInTheDocument();
    expect(screen.queryByTestId('offer-organizer-step-framing')).toBeNull();
  });

  it.each(['navigator', 'signature'])('%s tier runs the wizard with a first-class disclaimer on framing', (tier) => {
    render(<OfferOrganizer userTier={tier} />);
    expect(screen.getByTestId('offer-organizer-step-framing')).toBeInTheDocument();
    expect(screen.getByText(OFFER_COPY.framing.title)).toBeInTheDocument();
    expect(screen.getByText(OFFER_DISCLAIMER)).toBeInTheDocument();
    expect(screen.queryByTestId('offer-organizer-locked-teaser')).toBeNull();
  });
});

describe('OfferOrganizer — Enter the Offer persists to the store', () => {
  it('adds an asset line that appears in the list and persists; remove clears it', () => {
    render(<OfferOrganizer userTier="navigator" />);
    fireEvent.click(screen.getByText(OFFER_COPY.framing.cta)); // → Enter

    const input = screen.getByTestId('offer-asset-input');
    fireEvent.change(input, { target: { value: 'The lake cabin' } });
    fireEvent.click(screen.getByTestId('offer-asset-add'));

    expect(useM6Store.getState().offerOrganizer.offer.assetItems[0].label).toBe('The lake cabin');
    expect(screen.getByText('The lake cabin')).toBeInTheDocument();

    fireEvent.click(screen.getByText(OFFER_COPY.common.remove));
    expect(useM6Store.getState().offerOrganizer.offer.assetItems).toEqual([]);
  });
});

describe('OfferOrganizer — Map to Priorities is user-decided', () => {
  it('marking a priority "addressed" tags it in the store; the tool never pre-guesses', () => {
    seedPriority('Keep the house');
    render(<OfferOrganizer userTier="navigator" />);
    fireEvent.click(screen.getByText(OFFER_COPY.framing.cta)); // → Enter
    fireEvent.click(screen.getByText(OFFER_COPY.enter.continue)); // → Map

    // Nothing tagged until the user acts.
    expect(useM6Store.getState().offerOrganizer.offer).toBeNull();

    fireEvent.click(screen.getByTestId('wizard-radio-option-addressed'));
    expect(useM6Store.getState().offerOrganizer.offer.priorityTags).toEqual({
      'Keep the house': 'addressed',
    });
  });

  it('with no priorities set, the Map step shows the neutral pointer (offer still recordable)', () => {
    render(<OfferOrganizer userTier="navigator" />);
    fireEvent.click(screen.getByText(OFFER_COPY.framing.cta));
    fireEvent.click(screen.getByText(OFFER_COPY.enter.continue));
    expect(screen.getByText(OFFER_COPY.map.empty)).toBeInTheDocument();
  });
});

describe('OfferOrganizer — Review & explicit Save', () => {
  it('advances to Review (with the Blueprint-figure reference) and writes §11 only on Save', () => {
    seedPriority('Keep the house');
    render(<OfferOrganizer userTier="navigator" />);

    fireEvent.click(screen.getByText(OFFER_COPY.framing.cta)); // → Enter
    fireEvent.click(screen.getByText(OFFER_COPY.enter.continue)); // → Map
    fireEvent.click(screen.getByText(OFFER_COPY.map.continue)); // → Review

    expect(screen.getByTestId('offer-organizer-step-review')).toBeInTheDocument();
    expect(screen.getByText(OFFER_COPY.review.referenceHeading)).toBeInTheDocument();
    // The gap list surfaces what the offer is silent on (neutral language).
    expect(screen.getAllByText(/silent on/i).length).toBeGreaterThan(0);

    // No auto-write: §11 is still empty before the click.
    expect(useBlueprintStore.getState().sections.s11.data).toBeNull();

    fireEvent.click(screen.getByText(OFFER_COPY.review.save));

    expect(screen.getByTestId('offer-organizer-save-success')).toBeInTheDocument();
    const s11 = useBlueprintStore.getState().sections.s11;
    expect(s11.data).not.toBeNull();
    expect(s11.data.map[0]).toMatchObject({ priority: 'Keep the house', status: 'silent' });
    const viewLink = screen.getByRole('link', { name: new RegExp(OFFER_COPY.review.viewBlueprint, 'i') });
    expect(viewLink).toHaveAttribute('href', '/blueprint');
  });
});
