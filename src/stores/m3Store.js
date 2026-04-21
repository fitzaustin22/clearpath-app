import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useM1Store } from './m1Store';
import { useM2Store } from './m2Store';

// TODO: Swap localStorage for Supabase persistence for authenticated Essentials+ users

// ─── Helpers ──────────────────────────────────────────────────────────────────

const round2 = (n) => Math.round(n * 100) / 100;

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  let current = obj;
  for (const key of keys) {
    current = current[key];
  }
  current[last] = value;
  return obj;
}

function createEmptyExpenses() {
  return {
    home: {
      rentMortgage: 0, hoaFees: 0, propertyTaxes: 0, phone: 0,
      cellPhone: 0, internet: 0, cableSatellite: 0, securitySystem: 0,
      electricity: 0, gasOilPropane: 0, waterSewer: 0, trashRemoval: 0,
      lawnCare: 0, snowRemoval: 0, repairsMaintenance: 0,
      cleaningServices: 0, other: 0
    },
    food: {
      groceries: 0, snacks: 0, fastFood: 0, restaurantMeals: 0
    },
    entertainment: {
      entertainment: 0, movieTheater: 0, hobbies: 0, classesLessons: 0,
      vacationTravel: 0, membershipsClubs: 0
    },
    medical: {
      physicians: 0, dentistOrtho: 0, optometristVision: 0, prescriptions: 0
    },
    insurance: {
      life: 0, healthDental: 0, disability: 0, longTermCare: 0,
      home: 0, auto: 0, other: 0
    },
    transportation: {
      autoPayment: 0, fuel: 0, repairMaintenance: 0,
      parkingTolls: 0, license: 0, taxisPublicTransit: 0
    },
    personalMisc: {
      clothing: 0, dryCleaning: 0, giftsHoliday: 0,
      vitaminsOTC: 0, toiletries: 0, beautyHair: 0,
      petCare: 0, booksNewspapers: 0, homeOffice: 0,
      postageCourier: 0, education: 0, donations: 0, cash: 0
    },
    otherPayments: {
      quarterlyTaxes: 0, creditCardDebt: 0, loanPayments: 0,
      serviceFees: 0, eldercare: 0, spousalSupport: 0,
      childSupport: 0, professionalFees: 0, mediationCourt: 0,
      therapyCounseling: 0
    },
    children: {
      educationTuition: 0, schoolSupplies: 0, childcareWork: 0,
      childcareNonWork: 0, sportsCampsLessons: 0, hobbiesToysGames: 0,
      schoolMeals: 0, clothing: 0, medicalNotCovered: 0,
      dentalNotCovered: 0, optometristNotCovered: 0,
      prescriptionsNotCovered: 0, allowances: 0, transportation: 0,
      miscellaneous: 0
    },
    savings: {
      emergencyFund: 0, retirementContributions: 0, collegeSavings: 0,
      otherSavings: 0
    }
  };
}

function createEmptyAffidavitExpenses() {
  const expenses = createEmptyExpenses();
  delete expenses.savings;
  return {
    ...expenses,
    totalMonthlyExpenses: 0,
    totalMonthlyExpensesExcludingChildren: 0
  };
}

// ─── Exported Constants ───────────────────────────────────────────────────────

export const PAY_FREQUENCY_DEFAULTS = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12
};

export const ANNUAL_401K_LIMIT = 23500;
export const CATCH_UP_401K_LIMIT = 31000;
export const SS_WAGE_CAP = 168600;
export const SS_TAX_RATE = 0.062;

export const DEFAULT_DEDUCTIONS = [
  { id: 'fedTax', label: 'Federal Withholding', perPaycheck: 0, isVoluntary: false, isPreTax: false },
  { id: 'stateTax', label: 'State Withholding', perPaycheck: 0, isVoluntary: false, isPreTax: false },
  { id: 'socialSecurity', label: 'Social Security', perPaycheck: 0, isVoluntary: false, isPreTax: false },
  { id: 'medicare', label: 'Medicare', perPaycheck: 0, isVoluntary: false, isPreTax: false },
  { id: 'medical', label: 'Medical Insurance', perPaycheck: 0, isVoluntary: false, isPreTax: true },
  { id: 'dental', label: 'Dental Insurance', perPaycheck: 0, isVoluntary: false, isPreTax: true },
  { id: '401k', label: '401(k) / 403(b) / 457', perPaycheck: 0, isVoluntary: true, isPreTax: true }
];

export const DEFAULT_DEDUCTION_IDS = DEFAULT_DEDUCTIONS.map((d) => d.id);

export const BUDGET_CATEGORIES = [
  'home', 'food', 'entertainment', 'medical', 'insurance',
  'transportation', 'personalMisc', 'otherPayments', 'children', 'savings'
];

export const AFFIDAVIT_EXPENSE_CATEGORIES = [
  'home', 'food', 'entertainment', 'medical', 'insurance',
  'transportation', 'personalMisc', 'otherPayments', 'children'
]; // No savings — affidavit doesn't include it

export const CATEGORY_LABELS = {
  home: 'Home',
  food: 'Food',
  entertainment: 'Entertainment & Recreation',
  medical: 'Medical',
  insurance: 'Insurance',
  transportation: 'Transportation',
  personalMisc: 'Personal & Miscellaneous',
  otherPayments: 'Other Payments',
  children: 'Children',
  savings: 'Savings'
};

export const LINE_ITEM_LABELS = {
  rentMortgage: 'Rent / Mortgage',
  hoaFees: 'HOA Fees',
  propertyTaxes: 'Property Taxes',
  phone: 'Phone',
  cellPhone: 'Cell Phone',
  internet: 'Internet',
  cableSatellite: 'Cable / Satellite',
  securitySystem: 'Security System',
  electricity: 'Electricity',
  gasOilPropane: 'Gas / Oil / Propane',
  waterSewer: 'Water / Sewer',
  trashRemoval: 'Trash Removal',
  lawnCare: 'Lawn Care',
  snowRemoval: 'Snow Removal',
  repairsMaintenance: 'Repairs & Maintenance',
  cleaningServices: 'Cleaning Services',
  other: 'Other',
  groceries: 'Groceries',
  snacks: 'Snacks',
  fastFood: 'Fast Food',
  restaurantMeals: 'Restaurant Meals',
  entertainment: 'Entertainment',
  movieTheater: 'Movies / Theater',
  hobbies: 'Hobbies',
  classesLessons: 'Classes / Lessons',
  vacationTravel: 'Vacation / Travel',
  membershipsClubs: 'Memberships / Clubs',
  physicians: 'Physicians',
  dentistOrtho: 'Dentist / Orthodontist',
  optometristVision: 'Optometrist / Vision Care',
  prescriptions: 'Prescriptions',
  life: 'Life Insurance',
  healthDental: 'Health / Dental',
  disability: 'Disability',
  longTermCare: 'Long-Term Care',
  home: 'Home Insurance',
  auto: 'Auto Insurance',
  autoPayment: 'Auto Payment',
  fuel: 'Fuel',
  repairMaintenance: 'Repair & Maintenance',
  parkingTolls: 'Parking / Tolls',
  license: 'License',
  taxisPublicTransit: 'Taxis / Public Transit',
  clothing: 'Clothing',
  dryCleaning: 'Dry Cleaning',
  giftsHoliday: 'Gifts / Holiday',
  vitaminsOTC: 'Vitamins / OTC Drugs',
  toiletries: 'Toiletries',
  beautyHair: 'Beauty / Hair',
  petCare: 'Pet Care',
  booksNewspapers: 'Books / Newspapers',
  homeOffice: 'Home Office Supplies',
  postageCourier: 'Postage / Courier',
  education: 'Education',
  donations: 'Donations',
  cash: 'Cash',
  quarterlyTaxes: 'Quarterly Taxes',
  creditCardDebt: 'Credit Card Debt',
  loanPayments: 'Loan Payments',
  serviceFees: 'Service Fees',
  eldercare: 'Eldercare',
  spousalSupport: 'Spousal Support',
  childSupport: 'Child Support',
  professionalFees: 'Professional Fees',
  mediationCourt: 'Mediation / Court Costs',
  therapyCounseling: 'Therapy / Counseling',
  educationTuition: 'Education / Tuition',
  schoolSupplies: 'School Supplies / Field Trips',
  childcareWork: 'Childcare (Work-Related)',
  childcareNonWork: 'Childcare (Non-Work)',
  sportsCampsLessons: 'Sports / Camps / Lessons',
  hobbiesToysGames: 'Hobbies / Toys / Games',
  schoolMeals: 'School Meals',
  medicalNotCovered: 'Medical (Not Covered)',
  dentalNotCovered: 'Dental (Not Covered)',
  optometristNotCovered: 'Optometrist (Not Covered)',
  prescriptionsNotCovered: 'Prescriptions (Not Covered)',
  allowances: 'Allowances',
  transportation: 'Transportation',
  miscellaneous: 'Miscellaneous',
  emergencyFund: 'Emergency Fund',
  retirementContributions: 'Retirement Contributions',
  collegeSavings: 'College Savings',
  otherSavings: 'Other Savings'
};

// ─── Store ────────────────────────────────────────────────────────────────────

export const useM3Store = create(
  persist(
    (set, get) => ({

      // ═══════════════════════════════════════════
      // TOOL 1: PAY STUB DECODER
      // ═══════════════════════════════════════════
      payStubDecoder: {
        completed: false,
        completedAt: null,
        inputs: {
          hasEmploymentIncome: true,
          noIncomeConfirmed: false,
          payFrequency: null,
          paychecksPerYear: null,
          useCustomPaychecks: false,
          grossPayPerCheck: null,
          deductions: deepCopy(DEFAULT_DEDUCTIONS),
          otherIncomeSources: []
        },
        results: null
      },

      // ═══════════════════════════════════════════
      // TOOL 2: MARRIED-VS-SINGLE BUDGET MODELER
      // ═══════════════════════════════════════════
      budgetModeler: {
        completed: false,
        completedAt: null,
        prePopulated: {
          fromM1: false,
          fromM2: false,
          fromTool1: false
        },
        m1References: {
          home: 0,
          food: 0,
          entertainment: 0,
          medical: 0,
          insurance: 0,
          transportation: 0,
          personalMisc: 0,
          otherPayments: 0,
          children: 0,
          savings: 0
        },
        m2LiabilityRefs: [],
        current: createEmptyExpenses(),
        projected: createEmptyExpenses(),
        results: null
      },

      // ═══════════════════════════════════════════
      // TOOL 3: FINANCIAL AFFIDAVIT BUILDER
      // ═══════════════════════════════════════════
      affidavitBuilder: {
        completed: false,
        completedAt: null,
        prePopulated: {
          fromTool1: false,
          fromTool2: false,
          fromM2: false
        },
        sections: {
          income: {
            primaryEmployment: {
              employer: '',
              payFrequency: null,
              paychecksPerYear: null,
              grossPayPerCheck: 0,
              grossMonthlyIncome: 0,
              deductions: [],
              totalDeductions: 0,
              netMonthlyIncome: 0
            },
            otherIncome: [],
            deductionsFromOtherIncome: [],
            netMonthlyIncomeAllSources: 0,
            monthlyIncomeOfDependentChildren: 0
          },
          expenses: createEmptyAffidavitExpenses(),
          assets: {
            loaded: false,
            summary: {
              realProperty: 0,
              cashAccounts: 0,
              investments: 0,
              retirementAccounts: 0,
              otherAssets: 0,
              personalProperty: 0,
              totalAssets: 0
            }
          },
          liabilities: {
            loaded: false,
            noLiabilitiesConfirmed: false,
            summary: {
              loans: 0,
              creditCards: 0,
              otherDebt: 0,
              totalLiabilities: 0
            }
          }
        },
        progress: {
          incomeComplete: false,
          expensesComplete: false,
          assetsComplete: false,
          liabilitiesComplete: false
        },
        summary: {
          monthlyGap: 0
        }
      },

      // ═══════════════════════════════════════════
      // ACTIONS — TOOL 1: PAY STUB DECODER
      // ═══════════════════════════════════════════

      setPayStubField: (path, value) =>
        set((state) => {
          const updated = deepCopy(state.payStubDecoder);
          setNestedValue(updated, path, value);

          // Auto-update paychecksPerYear when payFrequency changes and not using custom
          if (path === 'inputs.payFrequency' && !updated.inputs.useCustomPaychecks) {
            updated.inputs.paychecksPerYear = PAY_FREQUENCY_DEFAULTS[value] || null;
          }
          // Reset paychecksPerYear to default when switching back from custom
          if (path === 'inputs.useCustomPaychecks' && value === false && updated.inputs.payFrequency) {
            updated.inputs.paychecksPerYear = PAY_FREQUENCY_DEFAULTS[updated.inputs.payFrequency];
          }

          return { payStubDecoder: updated };
        }),

      addDeduction: (deduction) =>
        set((state) => ({
          payStubDecoder: {
            ...state.payStubDecoder,
            inputs: {
              ...state.payStubDecoder.inputs,
              deductions: [
                ...state.payStubDecoder.inputs.deductions,
                { ...deduction, id: deduction.id || ('custom-' + Date.now()) }
              ]
            }
          }
        })),

      removeDeduction: (id) =>
        set((state) => {
          // Only allow removal of custom deductions (ids starting with "custom-")
          if (DEFAULT_DEDUCTION_IDS.includes(id)) return state;
          return {
            payStubDecoder: {
              ...state.payStubDecoder,
              inputs: {
                ...state.payStubDecoder.inputs,
                deductions: state.payStubDecoder.inputs.deductions.filter((d) => d.id !== id)
              }
            }
          };
        }),

      addOtherIncomeSource: (source) =>
        set((state) => ({
          payStubDecoder: {
            ...state.payStubDecoder,
            inputs: {
              ...state.payStubDecoder.inputs,
              otherIncomeSources: [
                ...state.payStubDecoder.inputs.otherIncomeSources,
                { ...source, id: source.id || ('other-' + Date.now()) }
              ]
            }
          }
        })),

      removeOtherIncomeSource: (id) =>
        set((state) => ({
          payStubDecoder: {
            ...state.payStubDecoder,
            inputs: {
              ...state.payStubDecoder.inputs,
              otherIncomeSources: state.payStubDecoder.inputs.otherIncomeSources.filter(
                (s) => s.id !== id
              )
            }
          }
        })),

      calculatePayStubResults: () =>
        set((state) => {
          const { inputs } = state.payStubDecoder;
          const paychecks = inputs.useCustomPaychecks
            ? inputs.paychecksPerYear
            : PAY_FREQUENCY_DEFAULTS[inputs.payFrequency];

          // Handle no-income path
          if (!inputs.hasEmploymentIncome) {
            const otherIncomeMonthly = round2(
              inputs.otherIncomeSources.reduce((s, src) => s + (src.monthlyAmount || 0), 0)
            );
            return {
              payStubDecoder: {
                ...state.payStubDecoder,
                completed: true,
                completedAt: new Date().toISOString(),
                results: {
                  grossMonthlyIncome: 0,
                  grossAnnualIncome: 0,
                  monthlyDeductions: { required: 0, voluntary: 0, total: 0 },
                  netMonthlyIncome: 0,
                  takeHomePay: 0,
                  otherIncomeMonthly,
                  totalMonthlyIncomeAllSources: otherIncomeMonthly,
                  deductionBreakdown: [],
                  warnings: []
                }
              }
            };
          }

          if (!paychecks || !inputs.grossPayPerCheck) return state;

          const grossMonthly = round2((inputs.grossPayPerCheck * paychecks) / 12);
          const grossAnnual = round2(inputs.grossPayPerCheck * paychecks);

          const deductionBreakdown = inputs.deductions.map((d) => ({
            id: d.id,
            label: d.label,
            isVoluntary: d.isVoluntary,
            monthly: round2((d.perPaycheck * paychecks) / 12),
            annual: round2(d.perPaycheck * paychecks)
          }));

          const requiredMonthly = round2(
            deductionBreakdown
              .filter((d) => !d.isVoluntary)
              .reduce((s, d) => s + d.monthly, 0)
          );
          const voluntaryMonthly = round2(
            deductionBreakdown
              .filter((d) => d.isVoluntary)
              .reduce((s, d) => s + d.monthly, 0)
          );
          const totalDeductionsMonthly = round2(requiredMonthly + voluntaryMonthly);
          const netMonthly = round2(grossMonthly - totalDeductionsMonthly);
          const takeHome = round2(netMonthly + voluntaryMonthly);
          const otherIncomeMonthly = round2(
            inputs.otherIncomeSources.reduce((s, src) => s + (src.monthlyAmount || 0), 0)
          );
          const totalAllSources = round2(takeHome + otherIncomeMonthly);

          // Warnings
          const warnings = [];
          if (inputs.payFrequency === 'biweekly') {
            const delta = round2((inputs.grossPayPerCheck * 2) / 12);
            warnings.push(
              "Just double-check: biweekly = every 2 weeks (26 paychecks/year). If you're paid on the 1st " +
              "and 15th, that's semi-monthly (24/year). This two-paycheck difference changes your monthly " +
              'income by $' + delta.toLocaleString() + '.'
            );
          }
          if (grossAnnual > SS_WAGE_CAP) {
            const ssRow = deductionBreakdown.find((d) => d.id === 'socialSecurity');
            const expectedMonthly = round2((SS_WAGE_CAP * SS_TAX_RATE) / 12);
            if (ssRow && ssRow.monthly > expectedMonthly + 1) {
              warnings.push(
                'Your income is above the Social Security wage cap ($' +
                SS_WAGE_CAP.toLocaleString() +
                '). Your average monthly SS deduction should be ~$' +
                expectedMonthly +
                ', not $' +
                ssRow.monthly +
                '.'
              );
            }
          }
          const k401 = deductionBreakdown.find((d) => d.id === '401k');
          if (k401 && k401.annual > ANNUAL_401K_LIMIT) {
            warnings.push(
              'Your 401(k) contributions ($' +
              k401.annual.toLocaleString() +
              '/yr) appear to exceed the annual limit ($' +
              ANNUAL_401K_LIMIT.toLocaleString() +
              ' under 50, $' +
              CATCH_UP_401K_LIMIT.toLocaleString() +
              ' if 50+).'
            );
          }
          // Health insurance detection:
          // Match the default Medical Insurance row, plus any deduction whose label
          // signals medical coverage (health, medical, HSA). Dental/vision alone
          // do NOT count — they do not imply medical coverage.
          const HEALTH_LABEL_RE = /\b(health|medical|hsa)\b/i;
          const hasHealthInsurance = inputs.deductions.some((d) => {
            if (!(d.perPaycheck > 0)) return false;
            if (d.id === 'medical') return true;
            return HEALTH_LABEL_RE.test(d.label || '');
          });
          if (!hasHealthInsurance) {
            warnings.push(
              "We didn't see a health insurance deduction on this paycheck. If you're " +
              "covered through your spouse's employer plan, you'll need to plan for COBRA " +
              'or replacement coverage when your divorce finalizes. If you\u2019re covered ' +
              "another way (Medicaid, marketplace, parent's plan if under 26), you can " +
              'ignore this note.'
            );
          }

          return {
            payStubDecoder: {
              ...state.payStubDecoder,
              completed: true,
              completedAt: new Date().toISOString(),
              results: {
                grossMonthlyIncome: grossMonthly,
                grossAnnualIncome: grossAnnual,
                monthlyDeductions: {
                  required: requiredMonthly,
                  voluntary: voluntaryMonthly,
                  total: totalDeductionsMonthly
                },
                netMonthlyIncome: netMonthly,
                takeHomePay: takeHome,
                otherIncomeMonthly,
                totalMonthlyIncomeAllSources: totalAllSources,
                deductionBreakdown,
                warnings
              }
            }
          };
        }),

      resetPayStubDecoder: () =>
        set(() => ({
          payStubDecoder: {
            completed: false,
            completedAt: null,
            inputs: {
              hasEmploymentIncome: true,
              noIncomeConfirmed: false,
              payFrequency: null,
              paychecksPerYear: null,
              useCustomPaychecks: false,
              grossPayPerCheck: null,
              deductions: deepCopy(DEFAULT_DEDUCTIONS),
              otherIncomeSources: []
            },
            results: null
          }
        })),

      // ═══════════════════════════════════════════
      // ACTIONS — TOOL 2: BUDGET MODELER
      // ═══════════════════════════════════════════

      prePopulateFromM1: () =>
        set((state) => {
          const m1State = useM1Store.getState();
          const inputs = m1State.budgetGap.inputs || {};

          const m1References = {
            home: round2((inputs.housing || 0) + (inputs.utilities || 0)),
            food: round2(inputs.groceries || 0),
            entertainment: 0, // M1 has no entertainment category
            medical: 0,       // M1 has no separate medical category
            insurance: round2(inputs.healthInsurance || 0),
            transportation: round2(inputs.transportation || 0),
            personalMisc: round2(inputs.personal || 0),
            otherPayments: round2(inputs.debtPayments || 0),
            children: round2(inputs.childcare || 0),
            savings: round2(inputs.savings || 0)
          };

          return {
            budgetModeler: {
              ...state.budgetModeler,
              m1References,
              prePopulated: {
                ...state.budgetModeler.prePopulated,
                fromM1: true
              }
            }
          };
        }),

      prePopulateFromM2Liabilities: () =>
        set((state) => {
          const m2State = useM2Store.getState();
          const items = m2State.maritalEstateInventory.items || [];
          const liabilityCategories = ['loans', 'creditCards', 'otherDebt'];

          const m2LiabilityRefs = items
            .filter((item) => liabilityCategories.includes(item.category))
            .map((item) => ({
              description: item.description,
              balance: item.currentValue,
              m2Category: item.category
            }));

          return {
            budgetModeler: {
              ...state.budgetModeler,
              m2LiabilityRefs,
              prePopulated: {
                ...state.budgetModeler.prePopulated,
                fromM2: true
              }
            }
          };
        }),

      prePopulateFromPayStub: () =>
        set((state) => ({
          budgetModeler: {
            ...state.budgetModeler,
            prePopulated: {
              ...state.budgetModeler.prePopulated,
              fromTool1: true
            }
          }
        })),

      setBudgetField: (column, category, field, value) =>
        set((state) => {
          if (column !== 'current' && column !== 'projected') return state;
          if (!BUDGET_CATEGORIES.includes(category)) return state;
          if (!(field in state.budgetModeler[column][category])) return state;

          return {
            budgetModeler: {
              ...state.budgetModeler,
              [column]: {
                ...state.budgetModeler[column],
                [category]: {
                  ...state.budgetModeler[column][category],
                  [field]: Number(value) || 0
                }
              }
            }
          };
        }),

      copyCategoryToProjected: (category) =>
        set((state) => ({
          budgetModeler: {
            ...state.budgetModeler,
            projected: {
              ...state.budgetModeler.projected,
              [category]: deepCopy(state.budgetModeler.current[category])
            }
          }
        })),

      copyAllToProjected: () =>
        set((state) => ({
          budgetModeler: {
            ...state.budgetModeler,
            projected: deepCopy(state.budgetModeler.current)
          }
        })),

      calculateBudgetResults: () =>
        set((state) => {
          const { current, projected } = state.budgetModeler;

          const categoryTotal = (col, category) =>
            round2(Object.values(col[category]).reduce((sum, val) => sum + (val || 0), 0));

          const currentTotal = round2(
            BUDGET_CATEGORIES.reduce((sum, cat) => sum + categoryTotal(current, cat), 0)
          );
          const projectedTotal = round2(
            BUDGET_CATEGORIES.reduce((sum, cat) => sum + categoryTotal(projected, cat), 0)
          );
          const delta = round2(projectedTotal - currentTotal);
          const deltaPercent = currentTotal > 0
            ? round2((delta / currentTotal) * 100)
            : null;

          const categoryDeltas = BUDGET_CATEGORIES.map((cat) => ({
            category: cat,
            current: categoryTotal(current, cat),
            projected: categoryTotal(projected, cat),
            delta: round2(categoryTotal(projected, cat) - categoryTotal(current, cat))
          }));

          // Line-item level deltas for top increases / decreases
          const allLineItemDeltas = [];
          BUDGET_CATEGORIES.forEach((cat) => {
            Object.keys(current[cat]).forEach((field) => {
              const c = current[cat][field] || 0;
              const p = projected[cat][field] || 0;
              if (c !== p) {
                allLineItemDeltas.push({
                  lineItem: field,
                  category: cat,
                  current: c,
                  projected: p,
                  delta: round2(p - c)
                });
              }
            });
          });
          const topIncreases = allLineItemDeltas
            .filter((d) => d.delta > 0)
            .sort((a, b) => b.delta - a.delta)
            .slice(0, 3);
          const topDecreases = allLineItemDeltas
            .filter((d) => d.delta < 0)
            .sort((a, b) => a.delta - b.delta)
            .slice(0, 3);

          // Income comparison (if Pay Stub Decoder completed)
          let incomeComparison = null;
          if (state.payStubDecoder.completed && state.payStubDecoder.results) {
            const income = state.payStubDecoder.results.totalMonthlyIncomeAllSources;
            incomeComparison = {
              monthlyIncome: income,
              currentSurplusShortfall: round2(income - currentTotal),
              projectedSurplusShortfall: round2(income - projectedTotal)
            };
          }

          return {
            budgetModeler: {
              ...state.budgetModeler,
              completed: true,
              completedAt: new Date().toISOString(),
              results: {
                currentTotal,
                projectedTotal,
                delta,
                deltaPercent,
                categoryDeltas,
                topIncreases,
                topDecreases,
                incomeComparison
              }
            }
          };
        }),

      resetBudgetModeler: () =>
        set(() => ({
          budgetModeler: {
            completed: false,
            completedAt: null,
            prePopulated: {
              fromM1: false,
              fromM2: false,
              fromTool1: false
            },
            m1References: {
              home: 0,
              food: 0,
              entertainment: 0,
              medical: 0,
              insurance: 0,
              transportation: 0,
              personalMisc: 0,
              otherPayments: 0,
              children: 0,
              savings: 0
            },
            m2LiabilityRefs: [],
            current: createEmptyExpenses(),
            projected: createEmptyExpenses(),
            results: null
          }
        })),

      // ═══════════════════════════════════════════
      // ACTIONS — TOOL 3: AFFIDAVIT BUILDER
      // ═══════════════════════════════════════════

      prePopulateAffidavitFromTools: () =>
        set((state) => {
          const updated = deepCopy(state.affidavitBuilder);

          // Source 1: Pay Stub Decoder
          if (state.payStubDecoder.completed && state.payStubDecoder.results && !updated.prePopulated.fromTool1) {
            const { inputs, results } = state.payStubDecoder;
            updated.sections.income.primaryEmployment.payFrequency = inputs.payFrequency;
            updated.sections.income.primaryEmployment.paychecksPerYear = inputs.paychecksPerYear;
            updated.sections.income.primaryEmployment.grossPayPerCheck = inputs.grossPayPerCheck || 0;
            updated.sections.income.primaryEmployment.grossMonthlyIncome = results.grossMonthlyIncome;
            updated.sections.income.primaryEmployment.deductions = deepCopy(results.deductionBreakdown);
            updated.sections.income.primaryEmployment.totalDeductions = results.monthlyDeductions.total;
            updated.sections.income.primaryEmployment.netMonthlyIncome = results.netMonthlyIncome;
            updated.sections.income.otherIncome = deepCopy(inputs.otherIncomeSources);
            updated.sections.income.netMonthlyIncomeAllSources = results.totalMonthlyIncomeAllSources;
            updated.prePopulated.fromTool1 = true;
          }

          // Source 2: Budget Modeler (projected = single column)
          if (state.budgetModeler.completed && !updated.prePopulated.fromTool2) {
            const { projected } = state.budgetModeler;
            AFFIDAVIT_EXPENSE_CATEGORIES.forEach((cat) => {
              updated.sections.expenses[cat] = deepCopy(projected[cat]);
            });

            // Recalculate totals
            const totalMonthlyExpenses = round2(
              AFFIDAVIT_EXPENSE_CATEGORIES.reduce((sum, cat) => {
                return sum + Object.values(updated.sections.expenses[cat]).reduce(
                  (s, v) => s + (v || 0), 0
                );
              }, 0)
            );
            const childrenTotal = round2(
              Object.values(updated.sections.expenses.children).reduce((s, v) => s + (v || 0), 0)
            );
            updated.sections.expenses.totalMonthlyExpenses = totalMonthlyExpenses;
            updated.sections.expenses.totalMonthlyExpensesExcludingChildren = round2(
              totalMonthlyExpenses - childrenTotal
            );
            updated.prePopulated.fromTool2 = true;
          }

          // Source 3: M2 Marital Estate Inventory
          const m2State = useM2Store.getState();
          const items = m2State.maritalEstateInventory.items || [];

          if (items.length > 0 && !updated.prePopulated.fromM2) {
            const sumByCategory = (cat) =>
              round2(
                items
                  .filter((i) => i.category === cat)
                  .reduce((s, i) => s + (Number(i.currentValue) || 0), 0)
              );

            const realProperty = sumByCategory('realEstate');
            const cashAccounts = sumByCategory('bankAccounts');
            const investments = sumByCategory('investments');
            const retirementAccounts = sumByCategory('retirementAccounts');
            const otherAssets = round2(
              sumByCategory('otherAssets') + sumByCategory('lifeInsurance')
            );
            const personalProperty = round2(
              m2State.personalPropertyInventory?.summary?.totalValue || 0
            );
            const totalAssets = round2(
              realProperty + cashAccounts + investments + retirementAccounts + otherAssets + personalProperty
            );

            updated.sections.assets.summary = {
              realProperty,
              cashAccounts,
              investments,
              retirementAccounts,
              otherAssets,
              personalProperty,
              totalAssets
            };
            updated.sections.assets.loaded = true;

            const loans = sumByCategory('loans');
            const creditCards = sumByCategory('creditCards');
            const otherDebt = sumByCategory('otherDebt');
            const totalLiabilities = round2(loans + creditCards + otherDebt);

            updated.sections.liabilities.summary = {
              loans,
              creditCards,
              otherDebt,
              totalLiabilities
            };
            updated.sections.liabilities.loaded = true;
            updated.prePopulated.fromM2 = true;
          }

          return { affidavitBuilder: updated };
        }),

      setAffidavitField: (section, path, value) =>
        set((state) => {
          const updated = deepCopy(state.affidavitBuilder);
          setNestedValue(updated.sections[section], path, value);

          // Auto-reset noLiabilitiesConfirmed when a liability value > 0 is set
          if (section === 'liabilities' && Number(value) > 0) {
            updated.sections.liabilities.noLiabilitiesConfirmed = false;
          }

          return { affidavitBuilder: updated };
        }),

      calculateAffidavitTotals: () =>
        set((state) => {
          const updated = deepCopy(state.affidavitBuilder);
          const { expenses, assets, liabilities } = updated.sections;

          // Sum 9 expense categories (no savings)
          const totalMonthlyExpenses = round2(
            AFFIDAVIT_EXPENSE_CATEGORIES.reduce((sum, cat) => {
              return sum + Object.values(expenses[cat]).reduce((s, v) => s + (v || 0), 0);
            }, 0)
          );
          const childrenTotal = round2(
            Object.values(expenses.children).reduce((s, v) => s + (v || 0), 0)
          );
          expenses.totalMonthlyExpenses = totalMonthlyExpenses;
          expenses.totalMonthlyExpensesExcludingChildren = round2(
            totalMonthlyExpenses - childrenTotal
          );

          // Asset and liability totals
          const totalAssets = round2(
            (assets.summary.realProperty || 0) +
            (assets.summary.cashAccounts || 0) +
            (assets.summary.investments || 0) +
            (assets.summary.retirementAccounts || 0) +
            (assets.summary.otherAssets || 0) +
            (assets.summary.personalProperty || 0)
          );
          assets.summary.totalAssets = totalAssets;

          const totalLiabilities = round2(
            (liabilities.summary.loans || 0) +
            (liabilities.summary.creditCards || 0) +
            (liabilities.summary.otherDebt || 0)
          );
          liabilities.summary.totalLiabilities = totalLiabilities;

          updated.summary.monthlyGap = round2(
            (updated.sections.income.netMonthlyIncomeAllSources || 0) -
            (updated.sections.expenses.totalMonthlyExpenses || 0)
          );

          return { affidavitBuilder: updated };
        }),

      markSectionComplete: (section) =>
        set((state) => {
          const updated = deepCopy(state.affidavitBuilder);
          const progressKey = section + 'Complete';
          updated.progress[progressKey] = true;

          // Minimum completion: income + expenses both done
          if (updated.progress.incomeComplete && updated.progress.expensesComplete) {
            updated.completed = true;
            updated.completedAt = updated.completedAt || new Date().toISOString();
          }

          return { affidavitBuilder: updated };
        }),

      resetAffidavitBuilder: () =>
        set(() => ({
          affidavitBuilder: {
            completed: false,
            completedAt: null,
            prePopulated: {
              fromTool1: false,
              fromTool2: false,
              fromM2: false
            },
            sections: {
              income: {
                primaryEmployment: {
                  employer: '',
                  payFrequency: null,
                  paychecksPerYear: null,
                  grossPayPerCheck: 0,
                  grossMonthlyIncome: 0,
                  deductions: [],
                  totalDeductions: 0,
                  netMonthlyIncome: 0
                },
                otherIncome: [],
                deductionsFromOtherIncome: [],
                netMonthlyIncomeAllSources: 0,
                monthlyIncomeOfDependentChildren: 0
              },
              expenses: createEmptyAffidavitExpenses(),
              assets: {
                loaded: false,
                summary: {
                  realProperty: 0,
                  cashAccounts: 0,
                  investments: 0,
                  retirementAccounts: 0,
                  otherAssets: 0,
                  personalProperty: 0,
                  totalAssets: 0
                }
              },
              liabilities: {
                loaded: false,
                noLiabilitiesConfirmed: false,
                summary: {
                  loans: 0,
                  creditCards: 0,
                  otherDebt: 0,
                  totalLiabilities: 0
                }
              }
            },
            progress: {
              incomeComplete: false,
              expensesComplete: false,
              assetsComplete: false,
              liabilitiesComplete: false
            },
            summary: {
              monthlyGap: 0
            }
          }
        }))
    }),
    {
      name: 'clearpath-m3-store',
      storage: createJSONStorage(() => localStorage)
    }
  )
);
