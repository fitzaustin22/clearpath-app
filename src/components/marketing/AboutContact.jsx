import { T } from '@/src/lib/brand/tokens';

// Embedded contact section — tint band with a large mailto link. No scheduling
// CTA and no form by design (v1 scope). Presentational Server Component; shared
// cp-mkt-* definitions are duplicated here so the section is self-contained.
const CSS = `
.cp-about-contact { background: ${T.SECTION_TINT}; padding: 90px 0; border-top: 1px solid ${T.LINE}; }
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
.cp-about-contact-lead {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 20px;
  line-height: 1.6;
  color: ${T.INK_2};
  margin: 0 0 48px 0;
}
.cp-about-contact-block { max-width: 680px; }
.cp-mkt-meta-label {
  font-family: var(--font-inter);
  font-weight: 700;
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: ${T.PILL_TEXT};
  margin: 0 0 14px 0;
}
.cp-about-contact-mail {
  font-family: var(--font-newsreader);
  font-weight: 500;
  font-size: 30px;
  line-height: 1.1;
  color: ${T.PILL_TEXT};
  text-decoration: none;
  border-bottom: 2px solid ${T.GOLD_BORDER};
  transition: color 140ms ease, border-color 140ms ease;
}
.cp-about-contact-mail:hover,
.cp-about-contact-mail:focus-visible {
  color: ${T.NAVY};
  border-bottom-color: ${T.NAVY};
}
.cp-about-contact-mail:focus-visible {
  outline: 2px solid ${T.GOLD};
  outline-offset: 4px;
}
.cp-about-contact-reply {
  font-family: var(--font-inter);
  font-weight: 400;
  font-size: 14px;
  line-height: 1.5;
  color: ${T.MUTED};
  margin: 18px 0 0 0;
}
@media (max-width: 768px) {
  .cp-about-contact { padding: 52px 0; }
  .cp-mkt-container { padding: 0 22px; }
  .cp-mkt-h2 { font-size: 27px; }
  .cp-about-contact-lead { font-size: 17.5px; }
  .cp-about-contact-mail { font-size: 23px; }
}
`;

export default function AboutContact() {
  return (
    <section className="cp-about-contact">
      <div className="cp-mkt-container">
        <p className="cp-mkt-eyebrow">Contact</p>
        <h2 className="cp-mkt-h2 cp-mkt-prose">Have a question? Write to us.</h2>
        <p className="cp-about-contact-lead cp-mkt-prose">
          There&rsquo;s no call to book and no form you&rsquo;re required to fill
          out. If something here raised a question &mdash; about the platform,
          the process, or whether ClearPath is right for where you are &mdash;
          send a note, and a real person will read it.
        </p>
        <div className="cp-about-contact-block">
          <p className="cp-mkt-meta-label">Email</p>
          <a className="cp-about-contact-mail" href="mailto:Support@Clearpath.com">
            Support@Clearpath.com
          </a>
          <p className="cp-about-contact-reply">
            We typically reply within two business days.
          </p>
        </div>
      </div>
      <style>{CSS}</style>
    </section>
  );
}
