import { T } from '@/src/lib/brand/tokens';
import {
  BookOpen,
  Scale,
  FileText,
  ClipboardCheck,
  ListChecks,
  Calculator,
  Slash,
} from 'lucide-react';
import ResourceCard from '@/src/components/marketing/ResourceCard';

// Resources library — three categories of resource cards on the same parchment
// field as the hero (no tint, no top hairline, flows directly from it). Card
// copy lives here as plain JS-string data, so curly typography is written as
// literal glyphs (rendered via {expression}, not JSX text). Presentational
// Server Component; scoped cp-mkt-res-* CSS in a self-contained <style>.
//
// Categorization note (PR-B B.1): "Free Tools" (renamed from the design's "Free
// Calculators") groups the three LIVE in-app tools — including the Asset & Debt
// Inventory, which is a web tool linking to /modules/m2, not an XLSX download.
const CATEGORIES = [
  {
    label: 'Start here · Guides',
    cards: [
      {
        icon: BookOpen,
        meta: 'Guide · PDF',
        title: 'The Divorce Financial Readiness Guide',
        description:
          'A plain-language walkthrough of the seven things worth understanding before you negotiate anything.',
        comingSoon: true,
      },
      {
        icon: Scale,
        meta: 'Guide',
        title: 'Understanding QDROs & Retirement Division',
        description:
          'How pensions and 401(k)s actually get divided — and the paperwork that makes it real.',
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Worksheets & Templates',
    cards: [
      {
        icon: FileText,
        meta: 'Worksheet · PDF',
        title: 'Monthly Budget & Expense Worksheet',
        description:
          'See your real cost of living, line by line, so your settlement reflects the life you actually live.',
        comingSoon: true,
      },
      {
        icon: ClipboardCheck,
        meta: 'Checklist · PDF',
        title: 'Financial Document Checklist',
        description:
          'Everything to gather before mediation, organized so nothing important gets left behind.',
        comingSoon: true,
      },
    ],
  },
  {
    label: 'Free Tools',
    cards: [
      {
        icon: ListChecks,
        meta: 'Tool',
        title: 'Asset & Debt Inventory',
        description:
          'Map the full marital estate — what’s owned, what’s owed, and what’s separate — in one place.',
        link: { href: '/modules/m2', text: 'Open inventory →' },
      },
      {
        icon: Calculator,
        meta: 'Calculator',
        title: 'Budget Gap Calculator',
        description:
          'Where your income and expenses stand today — and the gap there is to close.',
        link: { href: '/modules/m1', text: 'Open calculator →' },
      },
      {
        icon: Slash,
        meta: 'Calculator',
        title: 'Filing Status Estimator',
        description:
          'How a change in filing status could affect what you owe when tax time comes.',
        link: { href: '/modules/m4', text: 'Open calculator →' },
      },
    ],
  },
];

const CSS = `
.cp-mkt-res-library { background: ${T.PARCHMENT}; padding: 0 0 96px; }
.cp-mkt-container { max-width: 1120px; margin: 0 auto; padding: 0 40px; }
.cp-mkt-res-cat { margin-top: 64px; }
.cp-mkt-res-cat:first-child { margin-top: 44px; }
.cp-mkt-res-cat-head {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 28px;
}
.cp-mkt-res-cat-label {
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${T.PILL_TEXT};
  margin: 0;
  white-space: nowrap;
  flex-shrink: 0;
}
.cp-mkt-res-cat-rule { flex: 1; height: 1px; background: ${T.GOLD_BORDER}; }
.cp-mkt-res-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; }
.cp-mkt-res-close {
  max-width: 600px;
  margin: 72px auto 0;
  text-align: center;
  font-family: var(--font-newsreader);
  font-style: italic;
  font-weight: 400;
  font-size: 21px;
  line-height: 1.5;
  color: ${T.NAVY_70};
}
@media (max-width: 768px) {
  .cp-mkt-res-library { padding: 0 0 52px; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-mkt-res-cat-head { gap: 14px; }
  .cp-mkt-res-grid { grid-template-columns: 1fr; gap: 16px; }
  .cp-mkt-res-close { font-size: 19px; }
}
`;

export default function ResourcesLibrary() {
  return (
    <section className="cp-mkt-res-library">
      <div className="cp-mkt-container">
        {CATEGORIES.map((cat) => (
          <div key={cat.label} className="cp-mkt-res-cat">
            <div className="cp-mkt-res-cat-head">
              <span className="cp-mkt-res-cat-label">{cat.label}</span>
              <span className="cp-mkt-res-cat-rule" aria-hidden="true" />
            </div>
            <div className="cp-mkt-res-grid">
              {cat.cards.map((card) => (
                <ResourceCard key={card.title} {...card} />
              ))}
            </div>
          </div>
        ))}
        <p className="cp-mkt-res-close">
          When you&rsquo;re ready for the deeper analysis &mdash; tax modeling,
          valuations, your full Blueprint &mdash; it&rsquo;s waiting inside the
          platform. Until then, take whatever&rsquo;s useful here.
        </p>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
