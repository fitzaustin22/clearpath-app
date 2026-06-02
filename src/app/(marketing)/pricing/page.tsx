"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { T } from "@/src/lib/brand/tokens";
import PricingCard from "@/src/components/marketing/PricingCard";

// Stripe price IDs are sourced from env (identical wiring to /upgrade) — never
// hardcode IDs. If an env var is unset the paid CTA simply no-ops on click.
//   Essentials  → $97 one-time        → mode "payment"      → tier "essentials"
//   Full Access → $247 every 3 months → mode "subscription" → tier "navigator" (Full Access)
const ESSENTIALS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID;
const FULL_ACCESS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID;

const SEVEN_LESSONS = [
  { title: "Permission to Explore", desc: "Get your bearings before any big decisions" },
  { title: "Know What You Own", desc: "A complete picture of your assets, property & debts" },
  { title: "Know What You Spend", desc: "Decode your income and map your real budget" },
  { title: "Tax Landscape", desc: "How filing status and the tax code affect your settlement" },
  { title: "Value What Matters", desc: "What your pension, home, and support are really worth" },
  { title: "Negotiate from Strength", desc: "Rank priorities and pressure-test every offer" },
  { title: "Put It All Together", desc: "One financial plan to bring to your attorney" },
];

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleCheckout(priceId: string, mode: "payment" | "subscription") {
    setLoading(priceId);
    try {
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId, mode }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } finally {
      setLoading(null);
    }
  }

  // Paid-tier CTA mirrors /upgrade: the checkout API requires auth, so signed-out
  // visitors are routed to /signup first; signed-in visitors start Stripe checkout.
  function paidCta(label: string, priceId: string | undefined, mode: "payment" | "subscription") {
    if (!isLoaded) return { label, kind: "button" as const, disabled: true };
    if (isSignedIn && priceId) {
      return { label, kind: "button" as const, onClick: () => handleCheckout(priceId, mode), loading: loading === priceId };
    }
    return { label, kind: "link" as const, href: "/signup" };
  }

  return (
    <main style={{ backgroundColor: T.PARCHMENT, minHeight: "100vh", padding: "96px 32px" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <h1
          style={{
            fontFamily: T.FONT_DISPLAY,
            color: T.NAVY,
            fontSize: "clamp(2.25rem, 5vw, 3rem)",
            textAlign: "center",
            margin: "0 0 16px",
          }}
        >
          Choose Your Path Forward
        </h1>
        <p
          style={{
            fontFamily: T.FONT_BODY,
            color: T.NAVY_55,
            textAlign: "center",
            fontSize: "1.1rem",
            maxWidth: "640px",
            margin: "0 auto 64px",
          }}
        >
          Choose the level of support that fits your current needs.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "32px",
            alignItems: "start",
            paddingTop: "16px",
          }}
        >
          {/* Free */}
          <PricingCard
            name="Free"
            price="$0"
            tagline="Start getting clarity today"
            features={[
              { text: "Your first guided lesson: Permission to Explore" },
              { text: "Budget Gap Calculator" },
              { text: "“Could I Make It on My Own?” guide" },
              { text: "Financial Clarity Checklist" },
            ]}
            expander={<p style={{ margin: 0 }}>All free tools unlock with a quick email sign-up — no card required.</p>}
            cta={{ label: "Start free", kind: "link", href: "/signup" }}
          />

          {/* Essentials */}
          <PricingCard
            name="Essentials"
            price="$97"
            tagline="The complete prep toolkit"
            features={[
              { text: "Everything in Free, plus:", bold: true },
              { text: "Worksheets to catalog your assets, property & debts", indent: true },
              { text: "Budget & expense comparison worksheets", indent: true },
              { text: "Financial affidavit prep + document checklist", indent: true },
            ]}
            expander={
              <>
                <p style={{ margin: "0 0 8px" }}>• Attorney meeting prep guide</p>
                <p style={{ margin: 0, fontStyle: "italic" }}>
                  Note: Theo (your AI guide) and the advanced tax, retirement, and settlement analyzers come with Full
                  Access.
                </p>
              </>
            }
            cta={paidCta("Get the toolkit", ESSENTIALS_PRICE_ID, "payment")}
          />

          {/* Full Access — featured */}
          <PricingCard
            name="Full Access"
            price="$247"
            priceSuffix="/ 3 months"
            tagline="The whole platform, working for you"
            featured
            badge="Most popular"
            features={[
              { text: "Everything in Essentials, plus:", bold: true },
              { text: "All 7 guided lessons — from overwhelmed to negotiation-ready", indent: true },
              { text: "Theo, your AI guide — ask questions anytime", indent: true },
              { text: "Your complete Financial Blueprint — a PDF to bring to your attorney", indent: true },
            ]}
            expander={
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
            }
            cta={paidCta("Get Full Access", FULL_ACCESS_PRICE_ID, "subscription")}
          />
        </div>
      </div>
    </main>
  );
}
