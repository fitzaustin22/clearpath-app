/**
 * Tests for the 11 §7.9.2 callout components.
 *
 * Each component renders spec-pinned copy verbatim with optional runtime
 * data interpolation. These tests assert: (a) the root testid is present;
 * (b) a distinguishing spec phrase is rendered; (c) variant components
 * render the correct copy per variant.
 *
 * Per LL-20, afterEach(cleanup) is hoisted in vitest.setup.js.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import MultiEmployerFlagOnly from '../MultiEmployerFlagOnly';
import GovFlagOnly from '../GovFlagOnly';
import FrozenPlanTier1Routing from '../FrozenPlanTier1Routing';
import CovertureZeroFraction from '../CovertureZeroFraction';
import VestingStatusCallout from '../VestingStatusCallout';
import FormOfBenefitCallout from '../FormOfBenefitCallout';
import QpsaElectionCallout from '../QpsaElectionCallout';
import CashBalancePassthroughExplanation from '../CashBalancePassthroughExplanation';
import LumpSumOfferDivergence from '../LumpSumOfferDivergence';
import QdroHandoffRecommended from '../QdroHandoffRecommended';
import LiabilityDisclaimer from '../LiabilityDisclaimer';

describe('MultiEmployerFlagOnly', () => {
  it('renders root testid', () => {
    render(<MultiEmployerFlagOnly runtimeData={{ planName: 'ABC Fund' }} />);
    expect(screen.getByTestId('callout-multi_employer_flag_only')).toBeInTheDocument();
  });
  it('renders spec phrase about multi-employer plans', () => {
    render(<MultiEmployerFlagOnly runtimeData={{ planName: 'ABC Fund' }} />);
    expect(screen.getByText(/Multi-employer pension plans/i)).toBeInTheDocument();
  });
});

describe('GovFlagOnly', () => {
  it('renders csrs_fers variant copy', () => {
    render(<GovFlagOnly runtimeData={{ variant: 'csrs_fers', planName: 'CSRS' }} />);
    expect(screen.getByText(/Federal civilian pension plans/i)).toBeInTheDocument();
    expect(screen.getByTestId('callout-gov_flag_only')).toBeInTheDocument();
  });
  it('renders military variant copy', () => {
    render(<GovFlagOnly runtimeData={{ variant: 'military', planName: 'USAF' }} />);
    expect(screen.getByText(/Military retired pay/i)).toBeInTheDocument();
  });
  it('renders state_municipal variant copy', () => {
    render(<GovFlagOnly runtimeData={{ variant: 'state_municipal', planName: 'VRS' }} />);
    expect(screen.getByText(/State and municipal pension plans/i)).toBeInTheDocument();
  });
  it('returns null for unknown variant + warns in dev', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<GovFlagOnly runtimeData={{ variant: 'unknown' }} />);
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('FrozenPlanTier1Routing', () => {
  it('renders frozen-plan phrase', () => {
    render(<FrozenPlanTier1Routing runtimeData={{ planName: 'XYZ Pension Plan' }} />);
    expect(screen.getByText(/Your plan is frozen/i)).toBeInTheDocument();
  });
});

describe('CovertureZeroFraction', () => {
  it('renders coverture-zero phrase', () => {
    const runtime = { hire: '2010-01-15', marriage: '2005-06-20', cutoff: '2009-12-31', retirement: 65 };
    render(<CovertureZeroFraction runtimeData={runtime} />);
    expect(screen.getByText(/Coverture fraction computed to 0/i)).toBeInTheDocument();
  });
});

describe('VestingStatusCallout', () => {
  it('renders "partial vesting" for partially_vested', () => {
    render(<VestingStatusCallout runtimeData={{ vestingStatus: 'partially_vested' }} />);
    expect(screen.getByText(/partial vesting/i)).toBeInTheDocument();
  });
  it('renders "no vesting" for not_vested', () => {
    render(<VestingStatusCallout runtimeData={{ vestingStatus: 'not_vested' }} />);
    expect(screen.getByText(/no vesting/i)).toBeInTheDocument();
  });
  it('returns null for unknown vestingStatus + warns in dev', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<VestingStatusCallout runtimeData={{ vestingStatus: 'mystery' }} />);
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('FormOfBenefitCallout', () => {
  it('renders on_statement context copy with joint_50 phrase', () => {
    render(<FormOfBenefitCallout runtimeData={{ context: 'on_statement', form: 'joint_50' }} />);
    expect(screen.getByText(/Your plan statement quotes a/i)).toBeInTheDocument();
    expect(screen.getByText(/Joint and 50% Survivor/)).toBeInTheDocument();
  });
  it('renders in_pay context copy with joint_100 phrase', () => {
    render(<FormOfBenefitCallout runtimeData={{ context: 'in_pay', form: 'joint_100' }} />);
    expect(screen.getByText(/already drawing a/i)).toBeInTheDocument();
    expect(screen.getByText(/Joint and 100% Survivor/)).toBeInTheDocument();
  });
  it('returns null for unknown context + warns in dev', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { container } = render(<FormOfBenefitCallout runtimeData={{ context: 'weird', form: 'x' }} />);
    expect(container.firstChild).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('QpsaElectionCallout', () => {
  it('renders QPSA disclaimer', () => {
    render(<QpsaElectionCallout runtimeData={{}} />);
    expect(screen.getByText(/Qualified Pre-Retirement Survivor Annuity/i)).toBeInTheDocument();
  });
});

describe('CashBalancePassthroughExplanation', () => {
  it('renders cash-balance explanation', () => {
    render(<CashBalancePassthroughExplanation runtimeData={{}} />);
    expect(screen.getByText(/Cash balance plans technically convert/i)).toBeInTheDocument();
  });
});

describe('LumpSumOfferDivergence', () => {
  it('renders below-divergence copy', () => {
    render(
      <LumpSumOfferDivergence
        runtimeData={{ offer: 80000, toolPv: 100000, diff: -20000, pctDiff: -0.20 }}
      />,
    );
    expect(screen.getByText(/\$80,000/)).toBeInTheDocument();
    expect(screen.getByText(/\$100,000/)).toBeInTheDocument();
    expect(screen.getByText(/below/i)).toBeInTheDocument();
  });
  it('renders above-divergence copy', () => {
    render(
      <LumpSumOfferDivergence
        runtimeData={{ offer: 120000, toolPv: 100000, diff: 20000, pctDiff: 0.20 }}
      />,
    );
    expect(screen.getByText(/above/i)).toBeInTheDocument();
    expect(screen.getByText(/20\.0%/)).toBeInTheDocument();
  });
});

describe('QdroHandoffRecommended', () => {
  it('renders QDRO handoff copy', () => {
    render(<QdroHandoffRecommended runtimeData={{ path: 'tier_1', planType: 'private_db' }} />);
    expect(screen.getByText(/Qualified Domestic Relations Order/)).toBeInTheDocument();
  });
});

describe('LiabilityDisclaimer', () => {
  it('renders the planning-grade-estimate phrase', () => {
    render(<LiabilityDisclaimer runtimeData={{}} />);
    expect(screen.getByText(/Planning-grade estimate/i)).toBeInTheDocument();
    expect(screen.getByText(/not a legal opinion/i)).toBeInTheDocument();
  });
});
