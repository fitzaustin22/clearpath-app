import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import S3AssetInventory from '../S3AssetInventory';
import S5PropertyDivision from '../S5PropertyDivision';
import useBlueprintStore from '@/src/stores/blueprintStore';

// Minimal props that clear each section's early-return guard:
//   S3 → if (!data) return null;            S5 → if (!data || !data.faceValue) return null;
const S3_DATA = {};
const S5_DATA = { faceValue: { client: 0, spouse: 0, undecided: 0 } };

const addStub = (stub) => useBlueprintStore.getState().addDeferredCompStub(stub);
const resolveStub = (id) =>
  useBlueprintStore.getState().updateDeferredCompStub(id, {
    resolved: true,
    analysis: { tranches: [] },
    metadata: {
      formula: 'both',
      maritalShares: { hug: 75, nelson: 50 },
      intrinsicValue: { hug: 3000, nelson: 2000 },
    },
  });

const UNRESOLVED = { id: 'dcs_u', category: 'stockOptions', company: 'Acme' };
const RESOLVED = { id: 'dcs_r', category: 'stockOptions', company: 'Beacon' };

const BANNED_ASSERTIONS = ['you get', "you'll receive", 'your share is', '50-50', 'half of', 'you receive', 'your share'];

beforeEach(() => {
  localStorage.clear();
  useBlueprintStore.getState().resetBlueprint();
});

describe.each([
  ['S3AssetInventory', S3AssetInventory, S3_DATA, 's3'],
  ['S5PropertyDivision', S5PropertyDivision, S5_DATA, 's5'],
])('%s — deferred-comp advisory resolution (§9.7 #10, #14)', (name, Section, data, prefix) => {
  it('TC-10: shows the "Pending" advisory while a stub is unresolved', () => {
    addStub(UNRESOLVED);
    render(<Section data={data} status="empty" />);
    expect(screen.getByText(/Deferred Comp Pending/i)).toBeInTheDocument();
  });

  it('TC-10: clears the advisory once every stub is resolved', () => {
    addStub(RESOLVED);
    resolveStub('dcs_r');
    render(<Section data={data} status="empty" />);
    expect(screen.queryByText(/Deferred Comp Pending/i)).toBeNull();
  });

  it('TC-10: keeps the advisory when one is resolved and one is not', () => {
    addStub(UNRESOLVED);
    addStub(RESOLVED);
    resolveStub('dcs_r');
    render(<Section data={data} status="empty" />);
    expect(screen.getByText(/Deferred Comp Pending/i)).toBeInTheDocument();
    expect(screen.getByTestId(`${prefix}-deferred-comp-resolved-dcs_r`)).toBeInTheDocument();
  });

  it('TC-14: the resolved summary shows the marital PORTION (Hug/Nelson counts + intrinsic) only', () => {
    addStub(RESOLVED);
    resolveStub('dcs_r');
    render(<Section data={data} status="empty" />);
    const summary = screen.getByTestId(`${prefix}-deferred-comp-resolved-dcs_r`);
    expect(summary).toHaveTextContent('75'); // Hug marital shares
    expect(summary).toHaveTextContent('50'); // Nelson marital shares
    expect(summary).toHaveTextContent('$3,000'); // Hug intrinsic
    expect(summary).toHaveTextContent('$2,000'); // Nelson intrinsic
    expect(summary).toHaveTextContent(/not the final split/i);
  });

  it('TC-14: the resolved summary asserts no split — none of the banned vocabulary appears', () => {
    addStub(RESOLVED);
    resolveStub('dcs_r');
    const { container } = render(<Section data={data} status="empty" />);
    const text = container.textContent.toLowerCase();
    for (const phrase of BANNED_ASSERTIONS) {
      expect(text).not.toContain(phrase.toLowerCase());
    }
  });
});
