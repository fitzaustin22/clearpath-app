import { T } from '@/src/lib/brand/tokens';

// About page hero — parchment band, three-line display headline with a gold
// italic accent on the final line. Presentational Server Component; scoped
// cp-about-hero-* plus shared cp-mkt-* CSS (each section owns a self-contained
// <style>) per the DashboardPathView precedent.
const CSS = `
.cp-about-hero { background: ${T.PARCHMENT}; padding: 88px 0 76px; }
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
.cp-about-hero-h1 {
  font-family: var(--font-newsreader);
  font-weight: 500;
  font-size: 60px;
  line-height: 1.04;
  letter-spacing: -0.018em;
  color: ${T.NAVY};
  margin: 0;
  max-width: 680px;
}
.cp-about-hero-accent { font-style: italic; color: ${T.GOLD}; }
.cp-about-hero-lead {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 20px;
  line-height: 1.6;
  color: ${T.INK_2};
  margin: 30px 0 0 0;
  max-width: 680px;
}
@media (max-width: 768px) {
  .cp-about-hero { padding: 46px 0 40px; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-about-hero-h1 { font-size: 38px; }
  .cp-about-hero-lead { font-size: 17.5px; }
}
`;

export default function AboutHero() {
  return (
    <section className="cp-about-hero">
      <div className="cp-mkt-container">
        <p className="cp-mkt-eyebrow">About ClearPath</p>
        <h1 className="cp-about-hero-h1">
          Know your numbers.<br />
          Understand your options.<br />
          <em className="cp-about-hero-accent">Decide for yourself.</em>
        </h1>
        <p className="cp-about-hero-lead">
          ClearPath is a CDFA-grade divorce financial planning platform, built
          for women navigating one of the most significant financial
          transactions of their lives. We turn a moment that feels overwhelming
          into something you can see clearly, take at your own pace, and walk
          into prepared.
        </p>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
