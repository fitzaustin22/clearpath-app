import { Fragment, type ReactNode } from "react";
import { T } from "@/src/lib/brand/tokens";
import PricingCard from "@/src/components/marketing/PricingCard";
import { TIERS } from "@/src/components/marketing/pricingTiers";
import LeadMagnetForm from "@/src/components/marketing/LeadMagnetForm";
import BlueprintFlipbook from "@/src/components/marketing/BlueprintFlipbook";

/* ---------------------------------------------------------------------------
 * Inline SVG icons — hand-rolled stroke icons (repo idiom; no icon font).
 * ------------------------------------------------------------------------- */
function Icon({ color, size = 28, children }: { color: string; size?: number; children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

/* ---------------------------------------------------------------------------
 * Content data.
 * ------------------------------------------------------------------------- */

// Trust bar — three balanced items. CDFA + attorney-trust are owner-confirmed
// credentials (2026-06-02); "The modern way to handle divorce" is a brand tagline
// added per the design bundle (2026-06-03). (An unverified licensing claim was
// pulled 2026-06-02 as inaccurate and must not reappear.)
const TRUST_CLAIMS = [
  "Certified Divorce Financial Analyst",
  "Trusted by Leading Family Law Attorneys",
  "The modern way to handle divorce",
];

// Testimonial — attribution owner-confirmed 2026-06-02. (Copy kept as shipped;
// the design bundle proposed a different quote — flagged for the owner, not adopted.)
const TESTIMONIAL = {
  quote: "For the first time, I felt like someone was explaining my finances in a way I could actually understand and act on.",
  cite: "Sarah M., Virginia",
};

// Challenge cards — the middle card is the featured/elevated one per the design
// (Long-Term Impact, lifted and gold-kissed); the outer two are quieter.
const CHALLENGES = [
  {
    title: "Hidden Complexity",
    featured: false,
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
    title: "Long-Term Impact",
    featured: true,
    body: "Strategic forecasting that looks 20 years ahead, not just 20 days, protecting your lifestyle for the decades to come.",
    icon: (
      <Icon color={T.NAVY}>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </Icon>
    ),
  },
  {
    title: "Emotional Decisions",
    featured: false,
    body: "Providing a steady, analytical perspective when high-stakes choices feel overwhelming and clouded by immediate stress.",
    icon: (
      <Icon color={T.NAVY}>
        <circle cx="12" cy="9" r="6.5" />
        <path d="M7.5 19.5a4.6 4.6 0 0 1 9 0" />
        <path d="M12 12.2 10 10.2a1.35 1.35 0 0 1 1.9-1.9l.1.1.1-.1a1.35 1.35 0 0 1 1.9 1.9z" />
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
      <Icon color={T.PARCHMENT} size={30}>
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
      <Icon color={T.PARCHMENT} size={30}>
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
      <Icon color={T.PARCHMENT} size={30}>
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
      <Icon color={T.PARCHMENT} size={30}>
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
 * Shared style fragments. Tighter 1120px container per the design.
 * ------------------------------------------------------------------------- */
const SECTION_PAD = "clamp(64px, 9vw, 104px) clamp(20px, 5vw, 32px)";
const CONTAINER = { maxWidth: "1120px", margin: "0 auto" } as const;

const h2Style = {
  fontFamily: T.FONT_DISPLAY,
  color: T.NAVY,
  fontSize: "clamp(2.05rem, 4vw, 3rem)",
  fontWeight: 600,
  lineHeight: 1.14,
  letterSpacing: "-0.012em",
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
      <section style={{ padding: "clamp(56px, 8vw, 104px) clamp(20px, 5vw, 32px) clamp(72px, 11vw, 128px)" }}>
        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] items-center" style={{ ...CONTAINER, gap: "clamp(40px, 6vw, 72px)" }}>
          <div>
            <h1
              style={{
                fontFamily: T.FONT_DISPLAY,
                color: T.NAVY,
                fontSize: "clamp(2.75rem, 6vw, 4.4rem)",
                fontWeight: 600,
                lineHeight: 1.09,
                letterSpacing: "-0.014em",
                textWrap: "balance",
                margin: "0 0 34px",
              }}
            >
              Your Finances Deserve the Same <span style={{ fontStyle: "italic" }}>Fresh Start</span> You Do
            </h1>
            <p style={{ fontFamily: T.FONT_BODY, color: T.NAVY_70, fontSize: "clamp(1.12rem, 1.6vw, 1.32rem)", lineHeight: 1.6, maxWidth: "30em", margin: "0 0 40px" }}>
              Expert financial analysis and strategy for women navigating life&rsquo;s most pivotal financial chapters.
            </p>
            <div className="flex flex-wrap items-center" style={{ gap: "14px 28px" }}>
              <a
                href="#checklist"
                style={{
                  fontFamily: T.FONT_BODY,
                  backgroundColor: T.GOLD,
                  color: T.NAVY,
                  fontWeight: 700,
                  fontSize: "1.02rem",
                  textDecoration: "none",
                  textAlign: "center",
                  padding: "16px 30px",
                  borderRadius: "8px",
                  boxShadow: "0 6px 18px rgba(200, 169, 110, 0.28)",
                }}
              >
                Download the Financial Clarity Checklist
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center"
                style={{ fontFamily: T.FONT_BODY, color: T.NAVY, fontWeight: 600, fontSize: "1.02rem", textDecoration: "none", gap: "8px" }}
              >
                See How We Help
                <ArrowRight />
              </a>
            </div>
          </div>
          {/* Hero art: the scroll-scrubbed Financial Blueprint flip-book. Above the
              copy on mobile, right column on desktop. */}
          <div className="order-first lg:order-none mx-auto lg:ml-auto lg:mr-0" style={{ width: "100%", maxWidth: "384px" }}>
            <BlueprintFlipbook />
          </div>
        </div>
      </section>

      {/* 2 — Trust bar ------------------------------------------------------- */}
      <section style={{ backgroundColor: T.CARD, borderTop: `1px solid ${T.LINE}`, borderBottom: `1px solid ${T.LINE}`, padding: "26px clamp(20px, 5vw, 32px)" }}>
        <div className="flex flex-wrap items-center justify-center" style={{ ...CONTAINER, gap: "14px 30px" }}>
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
          <div style={{ width: "64px", height: "3px", backgroundColor: T.GOLD, borderRadius: "2px", margin: "22px 0 0" }} />
          <div className="grid grid-cols-1 md:grid-cols-3 items-stretch" style={{ gap: "26px", marginTop: "48px" }}>
            {CHALLENGES.map((c) => (
              <div
                key={c.title}
                className={c.featured ? "md:-translate-y-3" : undefined}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "14px",
                  padding: "38px 32px",
                  backgroundColor: c.featured ? T.CARD : "rgba(255, 255, 255, 0.45)",
                  border: c.featured ? `1px solid ${T.GOLD_BORDER}` : `1px solid ${T.LINE}`,
                  boxShadow: c.featured ? T.SHADOW_LIFT : "none",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "22px",
                    backgroundColor: c.featured ? T.PARCHMENT_DEEP : T.GOLD_TINT,
                  }}
                >
                  {c.icon}
                </div>
                <h3 style={{ fontFamily: T.FONT_DISPLAY, color: T.NAVY, fontSize: "1.42rem", fontWeight: 600, lineHeight: 1.2, margin: "0 0 12px" }}>{c.title}</h3>
                <p style={{ fontFamily: T.FONT_BODY, color: T.NAVY_70, fontSize: "0.96rem", lineHeight: 1.65, margin: 0 }}>{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4 — Testimonial ----------------------------------------------------- */}
      <section style={{ backgroundColor: T.CARD, padding: SECTION_PAD }}>
        <div style={{ maxWidth: "900px", margin: "0 auto" }}>
          <blockquote
            style={{
              fontFamily: T.FONT_DISPLAY,
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(1.55rem, 3vw, 2.3rem)",
              lineHeight: 1.4,
              color: T.NAVY,
              borderLeft: `4px solid ${T.GOLD}`,
              paddingLeft: "30px",
              margin: 0,
            }}
          >
            &ldquo;{TESTIMONIAL.quote}&rdquo;
          </blockquote>
          <cite style={{ display: "block", fontFamily: T.FONT_BODY, fontStyle: "normal", fontWeight: 600, fontSize: "1.05rem", color: T.NAVY_55, margin: "22px 0 0", paddingLeft: "34px" }}>
            &mdash; {TESTIMONIAL.cite}
          </cite>
        </div>
      </section>

      {/* 5 — The Path to Clarity -------------------------------------------- */}
      <section id="how-it-works" style={{ padding: SECTION_PAD }}>
        <div style={CONTAINER}>
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 56px" }}>
            <h2 style={{ ...h2Style, display: "inline-block" }}>The Path to Clarity</h2>
            <p style={{ ...sectionSubStyle, maxWidth: "560px" }}>A structured, compassionate approach to your financial transition.</p>
          </div>
          <div style={{ position: "relative" }}>
            {/* Connector hairline behind the circles (desktop only). */}
            <div className="hidden lg:block" style={{ position: "absolute", top: "38px", left: "12%", right: "12%", height: "1px", backgroundColor: T.LINE_STRONG, zIndex: 0 }} />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" style={{ gap: "40px 36px", position: "relative", zIndex: 1 }}>
              {STEPS.map((s) => (
                <div key={s.title} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      position: "relative",
                      width: "76px",
                      height: "76px",
                      borderRadius: "9999px",
                      backgroundColor: T.NAVY,
                      boxShadow: T.SHADOW_CARD,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 18px",
                    }}
                  >
                    {/* Gold numbered badge on the circle corner */}
                    <span
                      style={{
                        position: "absolute",
                        top: "-6px",
                        right: "-6px",
                        width: "26px",
                        height: "26px",
                        borderRadius: "9999px",
                        backgroundColor: T.GOLD,
                        color: T.NAVY,
                        fontFamily: T.FONT_DISPLAY,
                        fontWeight: 700,
                        fontSize: "0.85rem",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: `2px solid ${T.PARCHMENT}`,
                      }}
                    >
                      {s.n}
                    </span>
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
          <div style={{ textAlign: "center", maxWidth: "640px", margin: "0 auto 48px" }}>
            <h2 style={{ ...h2Style, display: "inline-block" }}>Choose Your Path Forward</h2>
            <p style={{ ...sectionSubStyle, maxWidth: "560px" }}>Choose the level of support that fits your current needs.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "28px", alignItems: "start", paddingTop: "12px" }}>
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
          <h2 style={{ fontFamily: T.FONT_DISPLAY, color: T.GOLD, fontSize: "clamp(2.05rem, 4vw, 3rem)", fontWeight: 600, lineHeight: 1.15, margin: "0 0 16px" }}>
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
