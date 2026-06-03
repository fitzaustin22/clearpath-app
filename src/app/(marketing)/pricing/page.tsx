"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { T } from "@/src/lib/brand/tokens";
import PricingCard from "@/src/components/marketing/PricingCard";
import { TIERS } from "@/src/components/marketing/pricingTiers";

// Stripe price IDs are sourced from env (identical wiring to /upgrade) — never
// hardcode IDs. If an env var is unset the paid CTA simply no-ops on click.
//   Essentials  → $97 one-time        → mode "payment"      → tier "essentials"
//   Full Access → $247 every 3 months → mode "subscription" → tier "navigator" (Full Access)
const ESSENTIALS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID;
const FULL_ACCESS_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID;

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

  // CTA per tier (id from the shared TIERS data): Free links to signup; the paid
  // tiers run Stripe checkout. All card CONTENT lives in pricingTiers — only the
  // CTA is page-specific, so the homepage can reuse the same data with link CTAs.
  function ctaFor(id: string) {
    if (id === "essentials") return paidCta("Get the toolkit", ESSENTIALS_PRICE_ID, "payment");
    if (id === "full") return paidCta("Get Full Access", FULL_ACCESS_PRICE_ID, "subscription");
    return { label: "Start free", kind: "link" as const, href: "/signup" };
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
          {TIERS.map((tier) => (
            <PricingCard key={tier.id} {...tier} cta={ctaFor(tier.id)} />
          ))}
        </div>
      </div>
    </main>
  );
}
