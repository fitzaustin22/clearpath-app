import { T } from '@/src/lib/brand/tokens';

// "Why we built this" — tint band with a drop cap on the first body paragraph
// and a gold-bordered pull quote. Presentational Server Component; shared
// cp-mkt-* definitions are duplicated here so the section is self-contained.
const CSS = `
.cp-about-mission { background: ${T.SECTION_TINT}; padding: 90px 0; border-top: 1px solid ${T.LINE}; }
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
.cp-about-mission-body {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 18px;
  line-height: 1.75;
  color: ${T.NAVY};
  margin: 0 0 24px 0;
}
.cp-about-mission-dropcap::first-letter {
  font-family: var(--font-newsreader);
  font-weight: 600;
  font-size: 62px;
  line-height: 0.9;
  float: left;
  padding: 6px 10px 0 0;
  color: ${T.NAVY};
}
.cp-about-mission-pullquote {
  font-family: var(--font-newsreader);
  font-style: italic;
  font-weight: 400;
  font-size: 26px;
  line-height: 1.4;
  color: ${T.NAVY};
  border-left: 2px solid ${T.GOLD};
  padding: 4px 0 4px 30px;
  margin: 36px 0 0 0;
  quotes: none;
}
@media (max-width: 768px) {
  .cp-about-mission { padding: 52px 0; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-mkt-h2 { font-size: 27px; }
  .cp-about-mission-body { font-size: 16.5px; }
  .cp-about-mission-dropcap::first-letter { font-size: 52px; }
  .cp-about-mission-pullquote { font-size: 22px; }
}
`;

export default function AboutMission() {
  return (
    <section className="cp-about-mission">
      <div className="cp-mkt-container">
        <p className="cp-mkt-eyebrow">Why we built this</p>
        <h2 className="cp-mkt-h2 cp-mkt-prose">
          Most people negotiate a divorce settlement without ever seeing the
          real financial picture.
        </h2>
        <div className="cp-mkt-prose">
          <p className="cp-about-mission-body cp-about-mission-dropcap">
            Too often, the person who didn&rsquo;t manage the money is asked to
            sign away their future before they understand it. Pensions get
            overlooked. Tax consequences surface years too late. The house still
            feels like home long after the math stops working. None of that is a
            failure of intelligence &mdash; it&rsquo;s a failure of access.
          </p>
          <p className="cp-about-mission-body">
            ClearPath was built by a Certified Divorce Financial Analyst to
            close that gap. It&rsquo;s a self-paced, guided platform that walks
            you through the financial side of divorce in seven clear steps
            &mdash; from your first questions to a settlement-ready plan &mdash;
            so that understanding your own finances is no longer a luxury
            reserved for whoever happened to handle them.
          </p>
          <p className="cp-about-mission-body">
            We are not a law firm, and we don&rsquo;t give legal advice. What we
            give you is the clarity to be a sharper, calmer client for the
            professionals who do &mdash; and the confidence to recognize a fair
            settlement when it&rsquo;s in front of you.
          </p>
          <blockquote className="cp-about-mission-pullquote">
            Clarity isn&rsquo;t a luxury. It&rsquo;s the difference between a
            decision you make and one that&rsquo;s made for you.
          </blockquote>
        </div>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
