"use client";
import { useState } from "react";
import { T } from "@/src/lib/brand/tokens";
import Expander from "@/src/components/marketing/Expander";

// Gold check rendered beside every feature line.
function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke={T.GOLD}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, marginTop: "2px" }}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/**
 * CTA renders either an <a> (link — e.g. Free → /signup) or a <button>
 * (Stripe checkout). The outline style fills navy on hover; the gold style
 * dims slightly. Brand colors come from the central T token object.
 */
function Cta({ cta, featured }) {
  const [hover, setHover] = useState(false);

  // `disabled` = not interactive yet (auth still loading); `loading` = a checkout
  // request is in flight. Either dims the control and suppresses the hover fill.
  const inactive = Boolean(cta.loading || cta.disabled);
  const showHover = hover && !inactive;

  const base = {
    marginTop: "auto",
    width: "100%",
    padding: "16px",
    borderRadius: "8px",
    fontFamily: T.FONT_BODY,
    fontWeight: 700,
    fontSize: "1rem",
    textAlign: "center",
    textDecoration: "none",
    display: "block",
    boxSizing: "border-box",
    transition: "background-color 0.2s ease, color 0.2s ease, opacity 0.2s ease",
  };

  const style = featured
    ? { ...base, backgroundColor: T.GOLD, color: T.NAVY, border: "none", opacity: inactive ? 0.6 : showHover ? 0.9 : 1 }
    : {
        ...base,
        backgroundColor: showHover ? T.NAVY : "transparent",
        color: showHover ? "rgba(255,255,255,1)" : T.NAVY,
        border: `2px solid ${T.NAVY}`,
        opacity: inactive ? 0.6 : 1,
      };

  const hoverProps = { onMouseEnter: () => setHover(true), onMouseLeave: () => setHover(false) };

  if (cta.kind === "link") {
    return (
      <a href={cta.href} style={{ ...style, cursor: "pointer" }} {...hoverProps}>
        {cta.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={cta.onClick}
      disabled={inactive}
      style={{ ...style, cursor: cta.loading ? "wait" : inactive ? "default" : "pointer" }}
      {...hoverProps}
    >
      {cta.loading ? "Loading…" : cta.label}
    </button>
  );
}

/**
 * A single marketing pricing tier card. `featured` renders the navy/gold
 * "Most popular" treatment; `expander` is the collapsible "See what's
 * included" body. Used three times on the /pricing page.
 *
 * Props are typed here (JSDoc) because this .jsx is consumed by the .tsx
 * /pricing page under allowJs+strict: without it, `features = []` infers as
 * never[] and `next build` rejects the page. All props are optional so the
 * Free/Essentials cards may omit priceSuffix/badge.
 *
 * @param {object} props
 * @param {string} [props.name]
 * @param {string} [props.price]
 * @param {string} [props.priceSuffix]
 * @param {string} [props.tagline]
 * @param {{ text: string, bold?: boolean, indent?: boolean }[]} [props.features]
 * @param {*} [props.expander]
 * @param {*} [props.cta]
 * @param {boolean} [props.featured]
 * @param {string} [props.badge]
 */
export default function PricingCard({
  name,
  price,
  priceSuffix,
  tagline,
  features = [],
  expander,
  cta,
  featured = false,
  badge,
}) {
  const cardStyle = featured
    ? { backgroundColor: T.NAVY, border: `4px solid ${T.GOLD}`, boxShadow: "0 24px 48px rgba(27, 42, 74, 0.25)" }
    : { backgroundColor: T.CARD, border: `1px solid ${T.LINE}`, boxShadow: T.SHADOW_CARD };

  const headingColor = featured ? T.GOLD : T.NAVY;
  const priceColor = featured ? "rgba(255,255,255,1)" : T.NAVY;
  // Navy ($0/$97) sits dark-on-light; the white $247 sits light-on-dark. At an
  // identical weight they read unequally (irradiation illusion) — dark-on-light
  // looks heavier/chunkier. Drop the navy price one step (700→600) so the two
  // match perceptually. Color and size are unchanged; the white $247 stays 700.
  const priceWeight = featured ? 700 : 600;
  const taglineColor = featured ? "rgba(255,255,255,0.8)" : T.NAVY_55;
  const featureColor = featured ? "rgba(255,255,255,0.9)" : T.NAVY_70;
  const expanderTextColor = featured ? "rgba(255,255,255,0.8)" : T.NAVY_70;

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        padding: "32px",
        borderRadius: "12px",
        ...cardStyle,
      }}
    >
      {badge ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translate(-50%, -50%)",
            backgroundColor: T.GOLD,
            color: "rgba(255,255,255,1)",
            padding: "6px 24px",
            borderRadius: "9999px",
            fontFamily: T.FONT_BODY,
            fontSize: "0.7rem",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            whiteSpace: "nowrap",
          }}
        >
          {badge}
        </div>
      ) : null}

      {/* Tier name: mixed-case, regular weight, untracked. fontWeight:400 is
          explicit because Preflight is disabled — a bare <h2> would inherit UA bold. */}
      <h2
        style={{
          fontFamily: T.FONT_DISPLAY,
          color: headingColor,
          fontSize: "1.5rem",
          fontWeight: 400,
          letterSpacing: "0",
          margin: "0 0 8px",
        }}
      >
        {name}
      </h2>

      {/* Price figure uses NUMERIC_STYLE (Newsreader + lining-nums tabular-nums)
          per the currency/hero-figure rule. Weight is perceptual: 700 for the
          white $247 (Stitch's font-bold), 600 for the navy prices — see priceWeight. */}
      <div
        style={{
          ...T.NUMERIC_STYLE,
          fontWeight: priceWeight,
          fontSize: "3rem",
          lineHeight: 1.1,
          color: priceColor,
          margin: "0 0 8px",
        }}
      >
        {price}
        {priceSuffix ? (
          <span
            style={{
              fontFamily: T.FONT_BODY,
              fontSize: "0.875rem",
              fontWeight: 400,
              fontStyle: "italic",
              opacity: 0.7,
              marginLeft: "4px",
            }}
          >
            {priceSuffix}
          </span>
        ) : null}
      </div>

      <p style={{ fontFamily: T.FONT_BODY, color: taglineColor, fontSize: "0.875rem", margin: "0 0 32px" }}>{tagline}</p>

      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((f) => (
          <li
            key={f.text}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              marginLeft: f.indent ? "16px" : 0,
              fontFamily: T.FONT_BODY,
              fontSize: "0.875rem",
              lineHeight: 1.5,
              color: featureColor,
            }}
          >
            <CheckIcon />
            <span style={{ fontWeight: f.bold ? 600 : 400 }}>{f.text}</span>
          </li>
        ))}
      </ul>

      <div style={{ margin: "0 0 32px" }}>
        <Expander accentColor={featured ? T.GOLD : T.NAVY}>
          <div style={{ fontFamily: T.FONT_BODY, fontSize: "0.875rem", lineHeight: 1.6, color: expanderTextColor }}>{expander}</div>
        </Expander>
      </div>

      <Cta cta={cta} featured={featured} />
    </div>
  );
}
