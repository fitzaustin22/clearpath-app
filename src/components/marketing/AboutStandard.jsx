import { T } from '@/src/lib/brand/tokens';
import DefinitionList from '@/src/components/marketing/editorial/DefinitionList';

// "The standard" — parchment band introducing what CDFA-grade means, rendered
// as a four-item numbered DefinitionList. Presentational Server Component;
// shared cp-mkt-* definitions are duplicated here so the section is
// self-contained.
const STANDARD_ITEMS = [
  {
    number: '01',
    title: 'Forensic, not approximate',
    body: 'Every asset, debt, pension, and tax consequence is accounted for — because the things that get missed are usually the things that cost the most.',
  },
  {
    number: '02',
    title: 'Built for the decades, not the decree',
    body: 'We model the years after the settlement, not just the day it’s signed — so a split that looks fair today is still fair at retirement.',
  },
  {
    number: '03',
    title: 'Plain language, always',
    body: 'QDROs, §1041 transfers, coverture, marital versus separate property — every term is explained the moment it appears. No jargon, no assumptions.',
  },
  {
    number: '04',
    title: 'Education, not legal advice',
    body: 'ClearPath provides financial education and planning. It makes you prepared for the conversations ahead; it never replaces your attorney.',
  },
];

const CSS = `
.cp-about-standard { background: ${T.PARCHMENT}; padding: 90px 0; }
.cp-mkt-container { max-width: 1120px; margin: 0 auto; padding: 0 40px; }
.cp-mkt-eyebrow {
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${T.PILL_TEXT};
  margin: 0 0 30px 0;
}
.cp-mkt-h2 {
  font-family: var(--font-newsreader);
  font-weight: 600;
  font-size: 34px;
  line-height: 1.18;
  letter-spacing: -0.01em;
  color: ${T.NAVY};
  margin: 0 0 36px 0;
}
.cp-mkt-prose { max-width: 680px; }
.cp-about-standard-lead {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 20px;
  line-height: 1.6;
  color: ${T.INK_2};
  margin: 0 0 48px 0;
}
.cp-about-standard-footnote {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: ${T.MUTED};
  margin: 36px auto 0 auto;
  max-width: 780px;
}
@media (max-width: 768px) {
  .cp-about-standard { padding: 52px 0; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-mkt-h2 { font-size: 27px; }
  .cp-about-standard-lead { font-size: 17.5px; }
}
`;

export default function AboutStandard() {
  return (
    <section className="cp-about-standard">
      <div className="cp-mkt-container">
        <p className="cp-mkt-eyebrow">The standard</p>
        <h2 className="cp-mkt-h2 cp-mkt-prose">What &ldquo;CDFA-grade&rdquo; means</h2>
        <p className="cp-about-standard-lead cp-mkt-prose">
          Every number in ClearPath is held to the standard a Certified Divorce
          Financial Analyst would apply to your case. In practice, that comes
          down to four things.
        </p>
        <DefinitionList items={STANDARD_ITEMS} />
        <p className="cp-about-standard-footnote">
          CDFA&reg; is a registered credential of the Institute for Divorce
          Financial Analysts.
        </p>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
