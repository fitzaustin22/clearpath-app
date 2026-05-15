// __tests__/homeDecisionConstants.test.js
//
// Coverage for build-time constants in homeDecisionConstants.js
// per M5-Tool-Specs.md §9.4.2, §9.6.3, §9.6.4, §9.6.5, §9.7.

import { describe, it, expect } from 'vitest';
import {
  INFLATION_ASSUMPTION,
  REFI_RATE_BY_CREDIT_BAND,
  PMI_MATRIX,
  STATE_CLOSING_COSTS_DEFAULT,
  PROJECTION_HORIZONS,
  DEFAULT_REFI_TERM_MONTHS,
  V1_ASSUMPTIONS,
} from '../homeDecisionConstants';

describe('homeDecisionConstants', () => {
  describe('REFI_RATE_BY_CREDIT_BAND', () => {
    it('has all four credit bands defined with ascending rates by descending credit quality', () => {
      const bands = ['excellent', 'good', 'fair', 'poor'];
      bands.forEach((b) => expect(REFI_RATE_BY_CREDIT_BAND[b]).toBeTypeOf('number'));
      // Spec §9.6.3 banded constants: 6.25 / 6.50 / 7.00 / 8.00
      expect(REFI_RATE_BY_CREDIT_BAND.excellent).toBe(0.0625);
      expect(REFI_RATE_BY_CREDIT_BAND.good).toBe(0.0650);
      expect(REFI_RATE_BY_CREDIT_BAND.fair).toBe(0.0700);
      expect(REFI_RATE_BY_CREDIT_BAND.poor).toBe(0.0800);
    });
  });

  describe('PMI_MATRIX', () => {
    it('has 3 credit bands (excellent/good/fair) × 3 LTV bands per §9.6.5', () => {
      const creditBands = ['excellent', 'good', 'fair'];
      const ltvBands = ['80-85', '85-90', '90-95'];
      creditBands.forEach((c) => {
        expect(PMI_MATRIX[c]).toBeDefined();
        ltvBands.forEach((ltv) => {
          expect(PMI_MATRIX[c][ltv]).toBeTypeOf('number');
          expect(PMI_MATRIX[c][ltv]).toBeGreaterThan(0);
        });
      });
      // poor not present — verdict forces red upstream per §9.6.2
      expect(PMI_MATRIX.poor).toBeUndefined();
    });
  });

  describe('STATE_CLOSING_COSTS_DEFAULT', () => {
    it('has 50-state coverage plus DEFAULT fallback', () => {
      const usps = [
        'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
        'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
        'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
        'VT','VA','WA','WV','WI','WY',
      ];
      usps.forEach((s) => {
        expect(STATE_CLOSING_COSTS_DEFAULT[s]).toBeTypeOf('number');
        expect(STATE_CLOSING_COSTS_DEFAULT[s]).toBeGreaterThanOrEqual(0.02);
        expect(STATE_CLOSING_COSTS_DEFAULT[s]).toBeLessThanOrEqual(0.05);
      });
      expect(STATE_CLOSING_COSTS_DEFAULT.DEFAULT).toBe(0.035);
    });

    it('NY is high-cost per §9.6.4, UT is low-cost per §9.6.4', () => {
      expect(STATE_CLOSING_COSTS_DEFAULT.NY).toBeGreaterThan(STATE_CLOSING_COSTS_DEFAULT.UT);
    });
  });

  describe('Other constants', () => {
    it('INFLATION_ASSUMPTION matches Federal Reserve long-run target per §9.4.2', () => {
      expect(INFLATION_ASSUMPTION).toBe(0.025);
    });

    it('PROJECTION_HORIZONS are 3/6/10 years per §9.7', () => {
      expect(PROJECTION_HORIZONS).toEqual([3, 6, 10]);
    });

    it('DEFAULT_REFI_TERM_MONTHS is 360 (30-year fixed conventional) per §9.3.2', () => {
      expect(DEFAULT_REFI_TERM_MONTHS).toBe(360);
    });

    it('V1_ASSUMPTIONS is frozen with locked v1 flags per §9.10', () => {
      expect(V1_ASSUMPTIONS.bpmiAssumption).toBe(true);
      expect(V1_ASSUMPTIONS.conventionalLoanAssumption).toBe(true);
      expect(V1_ASSUMPTIONS.realDollarConvention).toBe(true);
      expect(Object.isFrozen(V1_ASSUMPTIONS)).toBe(true);
    });
  });
});
