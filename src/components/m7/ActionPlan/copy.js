/**
 * Action Plan & Timeline — copy as data.
 *
 * Every user-facing string lives here so the step components stay logic-only.
 * Method-not-advice throughout: the tool ORGANIZES the user's own next steps,
 * professionals, and dates — it never recommends, ranks, scores, or judges.
 */

// Common-role quick-adds for the Professionals screen. Plain role labels — the
// user supplies the name/contact. (Slashes match the curriculum's role naming.)
export const SUGGESTED_ROLES = [
  'Attorney',
  'CDFA',
  'Accountant / CPA',
  'Financial Advisor',
  'Therapist / Counselor',
  'Mediator',
];

// First-class disclaimer, shown on Framing and Review. Organizing aid, not advice.
export const ACTION_PLAN_DISCLAIMER =
  'This action plan is an organizing aid, not legal or financial advice. Confirm your next steps and timelines with your own attorney or CDFA before you act on them.';

export const ACTION_PLAN_COPY = {
  common: {
    back: 'Back',
    continue: 'Continue',
    remove: 'Remove',
  },

  framing: {
    title: 'Your action plan & timeline',
    body: [
      'You have worked through what you own, what you spend, the tax picture, and what you want to protect. This last step turns those decisions into a plan you can act on.',
      'You will jot down the next steps to take, the professionals who can help, and the dates that matter — in your own words. Nothing here is fixed; you can come back and revise it any time.',
    ],
    begin: 'Begin',
  },

  nextSteps: {
    title: 'Next steps',
    subhead: 'What needs to happen next? Add a step, and optionally note a rough timeline and who is responsible.',
    suggestHeader: 'Suggested from your Blueprint',
    suggestExplainer:
      'Based on where you are in the modules. These are optional — add the ones that fit, dismiss the rest.',
    suggestAdd: 'Add',
    suggestDismiss: 'Dismiss',
    addLabel: '+ Add a step',
    stepLabel: 'Step',
    timelineLabel: 'Timeline (optional)',
    responsibleLabel: 'Who is responsible? (optional)',
    emptyState: 'No steps yet. Add one above, or pull one in from the suggestions.',
    continue: 'Continue',
  },

  professionals: {
    title: 'Your professional team',
    subhead: 'List the professionals who can help you carry out this plan. Tap a common role to start a card, then fill in the details.',
    quickAddHeader: 'Common roles',
    addLabel: '+ Add a professional',
    roleLabel: 'Role',
    nameLabel: 'Name',
    contactLabel: 'Contact (optional)',
    emptyState: 'No professionals yet. Tap a role above, or add one of your own.',
    continue: 'Continue',
  },

  keyDates: {
    title: 'Key dates',
    subhead: 'Note the dates that matter — filing deadlines, hearings, mediation sessions, or your own milestones.',
    addLabel: '+ Add a date',
    dateLabel: 'Date',
    eventLabel: 'What happens on this date?',
    emptyState: 'No dates yet. Add one above.',
    continue: 'Continue',
  },

  review: {
    title: 'Review & save',
    body: 'Here is your action plan as it will appear in your Blueprint. Save when you are ready — you can come back and revise it any time.',
    nextStepsHeading: 'Next steps',
    professionalsHeading: 'Professional team',
    keyDatesHeading: 'Key dates',
    emptyState:
      'Your action plan is empty so far. Add a next step, a professional, or a key date in the earlier screens, then come back to save.',
    save: 'Save to my Blueprint',
    success: 'Your action plan has been saved to your Blueprint.',
    viewBlueprint: 'View your Blueprint',
  },
};
