import { T } from '@/src/lib/brand/tokens';

// Single resource card for the /resources library grid. Presentational Server
// Component; scoped cp-mkt-res-card-* CSS in a self-contained <style> per the
// About* / DashboardPathView precedent.
//
// Props:
//   icon         Lucide icon component (rendered at 22px, navy stroke)
//   meta         small uppercase eyebrow label (e.g. "Calculator")
//   title        card heading (rendered as <h3>)
//   description  body copy
//   link         { href, text } for LIVE cards — text may include a trailing
//                "→", which is stripped and re-rendered as a decorative span so
//                the gap-based hover slide works
//   comingSoon   true for not-yet-shipped resources — renders a muted label
//                instead of a link
// Exactly one of `link` / `comingSoon` should be provided.
const CSS = `
.cp-mkt-res-card {
  background: ${T.CARD};
  border: 1px solid ${T.LINE};
  border-radius: 12px;
  box-shadow: ${T.SHADOW_CARD};
  padding: 26px 28px 24px;
  display: flex;
  flex-direction: column;
}
.cp-mkt-res-card-tile {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: ${T.PARCHMENT_DEEP};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 18px;
}
.cp-mkt-res-card-icon { width: 22px; height: 22px; color: ${T.NAVY}; }
.cp-mkt-res-card-meta {
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: ${T.PILL_TEXT};
  margin: 0 0 8px 0;
}
.cp-mkt-res-card-title {
  font-family: var(--font-newsreader);
  font-weight: 600;
  font-size: 21px;
  line-height: 1.3;
  color: ${T.NAVY};
  margin: 0 0 9px 0;
}
.cp-mkt-res-card-desc {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 15.5px;
  line-height: 1.55;
  color: ${T.INK_2};
  margin: 0 0 18px 0;
}
.cp-mkt-res-card-link {
  margin-top: auto;
  align-self: flex-start;
  font-family: var(--font-inter);
  font-weight: 600;
  font-size: 14.5px;
  color: ${T.PILL_TEXT};
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: gap 0.15s ease, color 0.12s ease;
}
.cp-mkt-res-card-link:hover,
.cp-mkt-res-card-link:focus-visible {
  color: ${T.NAVY};
  gap: 10px;
}
.cp-mkt-res-card-link:focus-visible {
  outline: 2px solid ${T.GOLD};
  outline-offset: 4px;
}
.cp-mkt-res-card-arrow { line-height: 1; }
.cp-mkt-res-card-soon {
  margin-top: auto;
  align-self: flex-start;
  font-family: var(--font-inter);
  font-weight: 600;
  font-size: 14.5px;
  color: ${T.NAVY_55};
}
`;

export default function ResourceCard({ icon: Icon, meta, title, description, link, comingSoon }) {
  // Keep the C.5 link.text verbatim as the source of truth; strip a trailing
  // arrow so it can be re-emitted as an aria-hidden span (the gap animates it).
  const label = link ? link.text.replace(/\s*→\s*$/, '') : '';

  return (
    <article className="cp-mkt-res-card">
      <span className="cp-mkt-res-card-tile" aria-hidden="true">
        <Icon className="cp-mkt-res-card-icon" size={22} strokeWidth={2} />
      </span>
      <p className="cp-mkt-res-card-meta">{meta}</p>
      <h3 className="cp-mkt-res-card-title">{title}</h3>
      <p className="cp-mkt-res-card-desc">{description}</p>
      {comingSoon ? (
        <span className="cp-mkt-res-card-soon">Coming soon</span>
      ) : link ? (
        <a className="cp-mkt-res-card-link" href={link.href}>
          <span>{label}</span>
          <span className="cp-mkt-res-card-arrow" aria-hidden="true">&rarr;</span>
        </a>
      ) : null}
      <style>{CSS}</style>
    </article>
  );
}
