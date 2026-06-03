import { Fragment, type ReactNode } from "react";
import { T } from "@/src/lib/brand/tokens";
import PricingCard from "@/src/components/marketing/PricingCard";
import { TIERS } from "@/src/components/marketing/pricingTiers";
import LeadMagnetForm from "@/src/components/marketing/LeadMagnetForm";

/* ---------------------------------------------------------------------------
 * Inline SVG icons — hand-rolled stroke icons (repo idiom; no icon font).
 * ------------------------------------------------------------------------- */
function Icon({ color, size = 28, children }: { color: string; size?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

// Decorative hero composition — geometric, ported from the Stitch hero SVG to T tokens.
function HeroArt() {
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "440px", margin: "0 auto", aspectRatio: "1 / 1" }} aria-hidden="true">
      <svg viewBox="0 0 400 400" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="40" y="40" width="280" height="280" rx="10" fill={T.NAVY} fillOpacity="0.92" />
        <circle cx="300" cy="300" r="96" fill={T.GOLD_SOFT} />
        <path d="M40 320 L320 40" stroke={T.PILL_TEXT} strokeWidth="2" />
        <rect x="180" y="100" width="160" height="160" fill="none" stroke={T.NAVY} strokeDasharray="10 10" strokeWidth="1" />
      </svg>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Content data.
 * ------------------------------------------------------------------------- */

// Trust claims — owner-confirmed 2026-06-02. "Certified Divorce Financial Analyst"
// is the practitioner's real CDFA credential; "Trusted by Leading Family Law
// Attorneys" was confirmed accurate by the owner. ("FINRA-Licensed Professional"
// was pulled 2026-06-02 as inaccurate.)
const TRUST_CLAIMS = [
  "Certified Divorce Financial Analyst",
  "Trusted by Leading Family Law Attorneys",
];

// Testimonial — attribution owner-confirmed 2026-06-02.
const TESTIMONIAL = {
  quote: "For the first time, I felt like someone was explaining my finances in a way I could actually understand and act on.",
  cite: "Sarah M., Virginia",
};

const CHALLENGES = [
  {
    title: "Hidden Complexity",
    body: "Uncovering the intricate financial layers often obscured during emotional transitions to ensure no asset is overlooked.",
    icon: (
      <Icon color={T.NAVY}>
        <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a13.16 13.16 0 0 1-1.67 2.68" />
        <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
        <line x1="2" y1="2" x2="22" y2="22" />
      </Icon>
    ),
  },
  {
    title: "Emotional Decisions",
    body: "Providing a steady, analytical perspective when high-stakes choices feel overwhelming and clouded by immediate stress.",
    icon: (
      <Icon color={T.NAVY}>
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </Icon>
    ),
  },
  {
    title: "Long-Term Impact",
    body: "Strategic forecasting that looks 20 years ahead, not just 20 days, protecting your lifestyle for the decades to come.",
    icon: (
      <Icon color={T.NAVY}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </Icon>
    ),
  },
];

const STEPS = [
  {
    n: 1,
    title: "Understand",
    body: "Gathering your story and your numbers.",
    icon: (
      <Icon color={T.PARCHMENT}>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </Icon>
    ),
  },
  {
    n: 2,
    title: "Organize",
    body: "Structuring assets for total visibility.",
    icon: (
      <Icon color={T.PARCHMENT}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </Icon>
    ),
  },
  {
    n: 3,
    title: "Analyze",
    body: "Modeling scenarios for your future.",
    icon: (
      <Icon color={T.PARCHMENT}>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </Icon>
    ),
  },
  {
    n: 4,
    title: "Decide",
    body: "Confident choices backed by data.",
    icon: (
      <Icon color={T.PARCHMENT}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </Icon>
    ),
  },
];

// Homepage tier CTAs all LINK to the canonical /pricing page — no Stripe here.
function homeCta(id: string) {
  const label = id === "essentials" ? "Get the toolkit" : id === "full" ? "Get Full Access" : "Start free";
  return { label, kind: "link" as const, href: "/pricing" };
}

/* ---------------------------------------------------------------------------
 * Shared style fragments.
 * ------------------------------------------------------------------------- */
const SECTION_PAD = "clamp(64px, 10vw, 104px) clamp(20px, 5vw, 32px)";
const CONTAINER = { maxWidth: "1200px", margin: "0 auto" } as const;

const h2Style = {
  fontFamily: T.FONT_DISPLAY,
  color: T.NAVY,
  fontSize: "clamp(2rem, 4vw, 3rem)",
  fontWeight: 600,
  lineHeight: 1.15,
  margin: 0,
} as const;

const sectionSubStyle = {
  fontFamily: T.FONT_BODY,
  color: T.NAVY_55,
  fontSize: "1.1rem",
  lineHeight: 1.6,
  margin: "16px auto 0",
} as const;

export default function Home() {
  return (
    <main style={{ backgroundColor: T.PARCHMENT }}>
      {/* 1 — Hero ------------------------------------------------------------ */}
      <section style={{ padding: "clamp(40px, 7vw, 88px) clamp(20px, 5vw, 32px) clamp(64px, 10vw, 120px)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-12 items-center" style={{ ...CONTAINER, gap: "48px" }}>
          <div className="lg:col-span-7">
            <h1
              style={{
                fontFamily: T.FONT_DISPLAY,
                color: T.NAVY,
                fontSize: "clamp(2.5rem, 6vw, 4.25rem)",
                fontWeight: 600,
                lineHeight: 1.08,
                margin: "0 0 24px",
              }}
            >
              Your Finances Deserve the Same <span style={{ fontStyle: "italic" }}>Fresh Start</span> You Do
            </h1>
            <p style={{ fontFamily: T.FONT_BODY, color: T.NAVY_70, fontSize: "clamp(1.1rem, 2vw, 1.4rem)", lineHeight: 1.6, maxWidth: "600px", margin: "0 0 40px" }}>
              Expert financial analysis and strategy for women navigating life&rsquo;s most pivotal financial chapters.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center" style={{ gap: "20px" }}>
              <a
                href="#checklist"
                style={{
                  fontFamily: T.FONT_BODY,
                  backgroundColor: T.GOLD,
                  color: T.NAVY,
                  fontWeight: 700,
                  fontSize: "1.05rem",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "16px 32px",
                  borderRadius: "8px",
                }}
              >
                Download the Financial Clarity Checklist
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center"
                style={{ fontFamily: T.FONT_BODY, color: T.NAVY, fontWeight: 600, fontSize: "1.05rem", textDecoration: "none", gap: "8px" }}
              >
                See How We Help
                <ArrowRight />
              </a>
            </div>
          </div>
          <div className="lg:col-span-5">
            <HeroArt />
          </div>
        </div>
      </section>

      {/* 2 — Trust bar ------------------------------------------------------- */}
      <section style={{ backgroundColor: T.CARD, borderTop: `1px solid ${T.LINE}`, borderBottom: `1px solid ${T.LINE}`, padding: "28px clamp(20px, 5vw, 32px)" }}>
        <div className="flex flex-wrap items-center justify-center" style={{ ...CONTAINER, gap: "14px 26px" }}>
          {TRUST_CLAIMS.map((claim, i) => (
            <Fragment key={claim}>
              {i > 0 ? (
                <span aria-hidden="true" style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: T.GOLD, display: "inline-block" }} />
              ) : null}
              <span style={{ fontFamily: T.FONT_BODY, color: T.NAVY_55, fontSize: "0.72rem", fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase" }}>
                {claim}
              </span>
            </Fragment>
          ))}
        </div>
      </section>

      {/* 3 — The Challenge --------------------------------------------------- */}
      <section style={{ padding: SECTION_PAD }}>
        <div style={CONTAINER}>
          <h2 style={h2Style}>The Challenge</h2>
          <div style={{ width: "64px", height: "3px", backgroundColor: T.GOLD, margin: "20px 0 0" }} />
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ gap: "28px", marginTop: "48px" }}>
            {CHALLENGES.map((c) => (
              <div
                key={c.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  backgroundColor: T.CARD,
                  border: `1px solid ${T.LINE}`,
                  borderRadius: "14px",
                  boxShadow: T.SHADOW_CARD,
                  padding: "36px 32px",
                }}
              >
                <div style={{ marginBottom: "20px" }}>{c.icon}</div>
                <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.NAVY, fontSize: "1.4rem", fontWeight: 600, margin: "0 0 12px" }}>{c.title}</h3>
                <p style={{ fontFamily: T.FONT_BODY, color: T.NAVY_70, fontSize: "0.95rem", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Testimonial ----------------------------------------------------- */}
      <section style={{ backgroundColor: T.CARD, padding: SECTION_PAD }}>
        <div style={{ maxWidth: "920px", margin: "0 auto" }}>
          <blockquote
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontStyle: "italic",
              fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
              lineHeight: 1.4,
              color: T.NAVY,
              borderLeft: `4px solid ${T.GOLD}`,
              paddingLeft: "28px",
              margin: 0,
            }}
          >
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <cite style={{ display: "block", fontFamily: T.FONT_BODY, fontStyle: "normal", fontWeight: 600, fontSize: "1.05rem", color: T.NAVY_55, margin: "20px 0 0", paddingLeft: "32px" }}>
            &mdash; {TESTIMONIAL.cite}
          </cite>
        </div>
      </section>

      {/* 5 — The Path to Clarity -------------------------------------------- */}
      <section id="how-it-works" style={{ padding: SECTION_PAD }}>
        <div style={CONTAINER}>
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
            <h2 style={h2Style}>The Path to Clarity</h2>
            <p style={{ ...sectionSubStyle, maxWidth: "560px" }}>A structured, compassionate approach to your financial transition.</p>
          </div>
          <div style={{ position: "relative" }}>
            {/* Connector hairline behind the circles (desktop only). */}
            <div className="hidden lg:block" style={{ position: "absolute", top: "38px", left: "12%", right: "12%", height: "1px", backgroundColor: T.LINE_STRONG, zIndex: 0 }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "40px", position: "relative", zIndex: 1 }}>
              {STEPS.map((s) => (
                <div key={s.title} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: "76px",
                      height: "76px",
                      borderRadius: "9999px",
                      backgroundColor: T.NAVY,
                      boxShadow: T.SHADOW_CARD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 16px",
                    }}
                  >
                    {s.icon}
                  </div>
                  <p style={{ fontFamily: T.FONT_BODY, color: T.GOLD, fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.15em", textTransform: "uppercase", margin: "0 0 6px" }}>
                    Step {s.n}
                  </p>
                  <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.NAVY, fontSize: "1.2rem", fontWeight: 600, margin: "0 0 8px" }}>{s.title}</h3>
                  <p style={{ fontFamily: T.FONT_BODY, color: T.NAVY_70, fontSize: "0.9rem", lineHeight: 1.6, maxWidth: "220px", margin: "0 auto" }}>{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 6 — Service Tiers --------------------------------------------------- */}
      <section style={{ backgroundColor: T.CARD, padding: SECTION_PAD }}>
        <div style={CONTAINER}>
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
            <h2 style={h2Style}>Choose Your Path Forward</h2>
            <p style={{ ...sectionSubStyle, maxWidth: "560px" }}>Choose the level of support that fits your current needs.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "32px", alignItems: "start", paddingTop: "16px" }}>
            {TIERS.map((tier) => (
              <PricingCard key={tier.id} {...tier} cta={homeCta(tier.id)} />
            ))}
          </div>
        </div>
      </section>

      {/* 7 — Lead Magnet ----------------------------------------------------- */}
      <section id="checklist" style={{ position: "relative", overflow: "hidden", backgroundColor: T.NAVY, padding: SECTION_PAD }}>
        <div aria-hidden="true" style={{ position: "absolute", inset: 0, opacity: 0.08, pointerEvents: "none" }}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="lm-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#FFFFFF" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#lm-grid)" />
          </svg>
        </div>
        <div style={{ position: "relative", zIndex: 1, maxWidth: "760px", margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontFamily: T.FONT_DISPLAY, color: T.GOLD, fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}>
            The Financial Clarity Checklist
          </h2>
          <p style={{ fontFamily: T.FONT_BODY, color: "rgba(255,255,255,0.8)", fontSize: "1.1rem", lineHeight: 1.6, margin: "0 0 40px" }}>
            21 critical questions to ask before signing any settlement agreement.
          </p>
          <LeadMagnetForm />
        </div>
      </section>
    </main>
  );
}
