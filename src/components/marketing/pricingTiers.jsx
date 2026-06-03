import { T } from "@/src/lib/brand/tokens";

/**
 * Shared marketing pricing-tier descriptors — the single source of truth for the
 * three tiers, consumed by BOTH the /pricing page (live Stripe-checkout CTAs) and
 * the homepage Service Tiers section (link CTAs → /pricing).
 *
 * Each tier carries everything <PricingCard> needs EXCEPT `cta`: the CTA is
 * supplied per page, so the homepage never imports the checkout/auth logic. `id`
 * lets each page attach the right CTA. `expander` is the collapsible body that
 * <PricingCard> renders inside its <Expander>.
 *
 * This is a .jsx (not .js) module because the expander content is JSX — it is
 * page-agnostic presentation shared verbatim by both consumers.
 */
export const SEVEN_LESSONS = [
  { title: "Permission to Explore", desc: "Get your bearings before any big decisions" },
  { title: "Know What You Own", desc: "A complete picture of your assets, property & debts" },
  { title: "Know What You Spend", desc: "Decode your income and map your real budget" },
  { title: "Tax Landscape", desc: "How filing status and the tax code affect your settlement" },
  { title: "Value What Matters", desc: "What your pension, home, and support are really worth" },
  { title: "Negotiate from Strength", desc: "Rank priorities and pressure-test every offer" },
  { title: "Put It All Together", desc: "One financial plan to bring to your attorney" },
];

export const TIERS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    tagline: "Start getting clarity today",
    features: [
      { text: "Your first guided lesson: Permission to Explore" },
      { text: "Budget Gap Calculator" },
      { text: "“Could I Make It on My Own?” guide" },
      { text: "Financial Clarity Checklist" },
    ],
    expander: <p style={{ margin: 0 }}>All free tools unlock with a quick email sign-up — no card required.</p>,
  },
  {
    id: "essentials",
    name: "Essentials",
    price: "$97",
    tagline: "The complete prep toolkit",
    features: [
      { text: "Everything in Free, plus:", bold: true },
      { text: "Worksheets to catalog your assets, property & debts", indent: true },
      { text: "Budget & expense comparison worksheets", indent: true },
      { text: "Financial affidavit prep + document checklist", indent: true },
    ],
    expander: (
      <>
        <p style={{ margin: "0 0 8px" }}>• Attorney meeting prep guide</p>
        <p style={{ margin: 0, fontStyle: "italic" }}>
          Note: Theo (your AI guide) and the advanced tax, retirement, and settlement analyzers come with Full
          Access.
        </p>
      </>
    ),
  },
  {
    id: "full",
    name: "Full Access",
    price: "$247",
    priceSuffix: "/ 3 months",
    tagline: "The whole platform, working for you",
    featured: true,
    badge: "Most popular",
    features: [
      { text: "Everything in Essentials, plus:", bold: true },
      { text: "All 7 guided lessons — from overwhelmed to negotiation-ready", indent: true },
      { text: "Theo, your AI guide — ask questions anytime", indent: true },
      { text: "Your complete Financial Blueprint — a PDF to bring to your attorney", indent: true },
    ],
    expander: (
      <>
        <p style={{ fontFamily: T.FONT_DISPLAY, margin: "0 0 12px", fontWeight: 700, color: "rgba(255,255,255,1)" }}>
          Your ClearPath, step by step:
        </p>
        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "16px" }}>
          {SEVEN_LESSONS.map((lesson, i) => (
            <li key={lesson.title} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <span style={{ fontFamily: T.FONT_DISPLAY, fontSize: "0.875rem", fontWeight: 600, color: "rgba(255,255,255,1)" }}>
                <span style={{ color: T.GOLD, marginRight: "4px" }}>{i + 1}.</span>
                {lesson.title}
              </span>
              <span style={{ fontSize: "0.75rem", fontStyle: "italic", color: "rgba(255,255,255,0.7)" }}>
                {lesson.desc}
              </span>
            </li>
          ))}
        </ol>
        <p style={{ margin: "12px 0 0", fontSize: "0.75rem", fontStyle: "italic", opacity: 0.7 }}>
          Plus analyzers for taxes, retirement division (QDRO), support, and your home — with Financial Blueprint PDF
          exports across every lesson — ready to bring to your attorney.
        </p>
      </>
    ),
  },
];
