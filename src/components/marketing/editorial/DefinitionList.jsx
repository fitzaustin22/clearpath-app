import { T } from '@/src/lib/brand/tokens';

// Reusable numbered definition list — numbered rows with hairline separators
// and a 2px gold top border on the first row. Presentational Server Component;
// scoped cp-deflist-* CSS mirrors the DashboardPathView <style> precedent.
// Reused by Pass 2 (Privacy/Terms) and possibly Pass 3 (Services).
//
// Props: items: [{ number: string, title: string, body: string }]
const CSS = `
.cp-deflist { max-width: 780px; margin: 0 auto; padding: 0; list-style: none; }
.cp-deflist-row { padding: 36px 0; border-top: 1px solid ${T.LINE}; }
.cp-deflist-row[data-first='true'] { border-top: 2px solid ${T.GOLD}; }
.cp-deflist-num {
  display: block;
  font-family: var(--font-inter, Inter, system-ui, sans-serif);
  font-weight: 700;
  font-size: 12px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${T.PILL_TEXT};
  margin-bottom: 12px;
}
.cp-deflist-title {
  font-family: var(--font-newsreader, Newsreader, Georgia, serif);
  font-weight: 600;
  font-size: 21px;
  line-height: 1.3;
  color: ${T.NAVY};
  margin: 0 0 12px 0;
}
.cp-deflist-body {
  font-family: var(--font-inter, Inter, system-ui, sans-serif);
  font-weight: 400;
  font-size: 16.5px;
  line-height: 1.7;
  color: ${T.NAVY};
  margin: 0;
}
@media (max-width: 768px) {
  .cp-deflist-row { padding: 30px 0; }
  .cp-deflist-body { font-size: 15.5px; }
}
`;

export default function DefinitionList({ items }) {
  return (
    <>
      <ol className="cp-deflist">
        {items.map((item, i) => (
          <li key={item.number} className="cp-deflist-row" data-first={i === 0}>
            <span className="cp-deflist-num">{item.number}</span>
            <h3 className="cp-deflist-title">{item.title}</h3>
            <p className="cp-deflist-body">{item.body}</p>
          </li>
        ))}
      </ol>
      <style>{CSS}</style>
    </>
  );
}
