import { T } from '@/src/lib/brand/tokens';

// Resources page hero — parchment band, two-line display headline with a gold
// italic accent on the final line. Presentational Server Component; scoped
// cp-mkt-res-hero-* plus shared cp-mkt-* CSS (each section owns a
// self-contained <style>) per the About* / DashboardPathView precedent.
const CSS = `
.cp-mkt-res-hero { background: ${T.PARCHMENT}; padding: 88px 0 24px; }
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
.cp-mkt-res-hero-h1 {
  font-family: var(--font-newsreader);
  font-weight: 500;
  font-size: 52px;
  line-height: 1.04;
  letter-spacing: -0.018em;
  color: ${T.NAVY};
  margin: 0;
  max-width: 680px;
}
.cp-mkt-res-hero-accent { font-style: italic; color: ${T.GOLD}; }
.cp-mkt-res-hero-lead {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 20px;
  line-height: 1.6;
  color: ${T.INK_2};
  margin: 28px 0 0 0;
  max-width: 680px;
}
@media (max-width: 768px) {
  .cp-mkt-res-hero { padding: 52px 0 16px; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-mkt-res-hero-h1 { font-size: 38px; }
  .cp-mkt-res-hero-lead { font-size: 17.5px; }
}
`;

export default function ResourcesHero() {
  return (
    <section className="cp-mkt-res-hero">
      <div className="cp-mkt-container">
        <p className="cp-mkt-eyebrow">Resources</p>
        <h1 className="cp-mkt-res-hero-h1">
          Free tools to help you<br />
          <em className="cp-mkt-res-hero-accent">find your footing.</em>
        </h1>
        <p className="cp-mkt-res-hero-lead">
          Everything here is free to download or use &mdash; no account, no email
          required. These are the same worksheets, checklists, and calculators
          built into the early steps of ClearPath, shared openly so you can start
          making sense of your finances today, wherever you are in the process.
        </p>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
