// Verbatim copy from the design bundle (Support Estimator.dc.html). Do not paraphrase.
export const EYEBROW = 'MODULE 5 · SUPPORT ESTIMATOR';

export const HEADINGS = {
  1: "Let’s start with income",
  2: 'Your children and time together',
  3: 'A little about your marriage',
  4: 'Your support estimate',
};
export const SUBS = {
  1: 'Two numbers get us most of the way. Use gross monthly income — before taxes and deductions. An estimate is fine.',
  2: 'Support depends a lot on who the children live with and the costs of raising them. There are no right answers here.',
  3: 'How long you were married and any support you’re already paying can shift the numbers up or down.',
  4: 'Here’s a realistic range based on what you told us. Think of it as a starting point for the conversation — not a promise.',
};
export const FOOTER_TITLES = { 1: 'Your income', 2: 'Children & time', 3: 'Marriage details' };
export const FOOTER_SUBS = { 1: 'Two numbers to begin', 2: 'Custody and monthly costs', 3: 'Almost there' };
export const nextLabel = (step) => (step === 3 ? 'See my estimate →' : 'Continue →');

export const STATE_OPTIONS = [
  { value: 'VA', label: 'Virginia (VA)' },
  { value: 'MD', label: 'Maryland (MD)' },
  { value: 'DC', label: 'Washington, D.C.' },
  { value: 'NY', label: 'New York (NY)' },
  { value: 'CA', label: 'California (CA)' },
];
export const CHILDREN_OPTIONS = [
  { value: '0', label: 'No children' },
  { value: '1', label: '1 child' },
  { value: '2', label: '2 children' },
  { value: '3', label: '3 children' },
  { value: '4', label: '4 children' },
  { value: '5', label: '5 or more' },
];

export const HELP = {
  incomeYou: 'Gross, before taxes',
  incomeSpouse: 'A best estimate is fine',
  state: 'Support guidelines differ by state. We’ll use yours.',
  childcare: 'Leave at 0 if none',
  health: 'The part paid each month for them',
  marriage: 'Longer marriages often mean support lasts longer.',
  existing: 'Child or spousal support from an earlier relationship. Leave at 0 if none.',
};
export const SLIDER_TRACK = ['Mostly your spouse', 'Shared 50/50', 'Mostly you'];

export const STEP3_CALLOUT = "You’re done entering numbers. Next we’ll show a realistic range — remember it’s a guide to help you walk in informed, not a final figure.";

export const WHAT_CHANGES = [
  ['The gap between your incomes.', 'The wider it is, the more spousal support tends to be.'],
  ['How nights are split.', 'More overnights with you generally means more child support coming in.'],
  ['Childcare and health costs.', 'These get added on top and divided between you.'],
  ['Marriage length and existing support.', 'A longer marriage can extend support; what you already pay reduces it.'],
];

export const SHOW_THE_MATH = [
  'We start with both gross monthly incomes and find the higher and lower earner.',
  'Spousal support uses the AAML rule of thumb: 30% of the higher earner’s income minus 20% of the lower earner’s — capped so the lower earner’s share stays under 40% of your combined income.',
  'Child support estimates what your children cost at your combined income, adds childcare and health premiums, then splits it by each parent’s income and overnights.',
  'The low–high range reflects that judges have discretion. Your actual order can land anywhere in this band.',
];
export const SHOW_THE_MATH_LEADS = { 1: 'Spousal support', 2: 'Child support', 3: 'low–high range' };

export const mathNote = (stateName) =>
  `These are widely used guideline formulas, not ${stateName}’s binding worksheet. ${stateName} courts weigh many factors and decide the final amount.`;

export const DISCLAIMER_LABEL = 'ESTIMATE, NOT LEGAL ADVICE';
export const DISCLAIMER_BODY =
  'This is an informational estimate to help you prepare. ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice. Your final support amount is set by the court or your agreement.';

export const SAVE_LABEL = 'Save to my Blueprint';
export const SAVED_LABEL = 'Saved to your Blueprint';
export const EDIT_LABEL = 'Edit my answers';
export const PRIVACY_LABEL = 'Private & encrypted';
export const RESULTS_EYEBROW = 'YOUR ESTIMATE';
