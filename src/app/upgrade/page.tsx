"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";

const TIERS = [
  { name: "ClearPath Essentials", price: "$97", billing: "one-time", priceId: process.env.NEXT_PUBLIC_STRIPE_ESSENTIALS_PRICE_ID!, mode: "payment" as const, features: ["Full Module 1 ungated", "Module 2 asset worksheets", "Module 3 expense worksheets", "Document checklist", "Attorney meeting prep guide"] },
  { name: "ClearPath Navigator", price: "$247", billing: "every 3 months", priceId: process.env.NEXT_PUBLIC_STRIPE_NAVIGATOR_PRICE_ID!, mode: "subscription" as const, features: ["Everything in Essentials", "Full curriculum Modules 1-6", "Proprietary AI knowledge base", "Unlimited AI sessions 24/7", "Advanced financial tools"], featured: true },
]

export default function UpgradePage() {
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

  return (
    <main style={{ backgroundColor: "#FAF8F2", minHeight: "100vh", padding: "60px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "2.5rem", textAlign: "center", marginBottom: "12px" }}>Choose Your Path</h1>
        <p style={{ color: "rgba(27,42,74,0.7)", textAlign: "center", fontSize: "1.1rem", marginBottom: "48px" }}>Start free. Upgrade when you are ready.</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {TIERS.map((tier) => (
            <div key={tier.name} style={{ backgroundColor: tier.featured ? "#1B2A4A" : "white", borderRadius: "8px", padding: "40px", boxShadow: "0 2px 12px rgba(27,42,74,0.08)" }}>
              <h2 style={{ fontFamily: "Playfair Display, serif", color: "#C8A96E", fontSize: "1.4rem", marginBottom: "8px" }}>{tier.name}</h2>
              <p style={{ color: "#C8A96E", fontSize: "2rem", fontWeight: 700, marginBottom: "4px" }}>{tier.price}</p>
              <p style={{ color: tier.featured ? "rgba(255,255,255,0.6)" : "rgba(27,42,74,0.5)", fontSize: "0.9rem", marginBottom: "24px" }}>{tier.billing}</p>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px" }}>
                {tier.features.map((f) => (
                  <li key={f} style={{ color: tier.featured ? "rgba(255,255,255,0.85)" : "rgba(27,42,74,0.8)", marginBottom: "10px", paddingLeft: "20px", position: "relative", fontSize: "0.95rem" }}>
                    <span style={{ position: "absolute", left: 0, color: "#C8A96E" }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              {!isLoaded ? (
                <button disabled style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "14px 24px", borderRadius: "4px", fontWeight: 700, border: "none", cursor: "wait", fontSize: "1rem", opacity: 0.6 }}>
                  Get Started
                </button>
              ) : isSignedIn ? (
                <button
                  onClick={() => handleCheckout(tier.priceId, tier.mode)}
                  disabled={loading === tier.priceId}
                  style={{ display: "block", width: "100%", textAlign: "center", backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "14px 24px", borderRadius: "4px", fontWeight: 700, border: "none", cursor: loading === tier.priceId ? "wait" : "pointer", fontSize: "1rem" }}
                >
                  {loading === tier.priceId ? "Loading…" : "Get Started"}
                </button>
              ) : (
                <a href="/signup" style={{ display: "block", textAlign: "center", backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "14px 24px", borderRadius: "4px", fontWeight: 700, textDecoration: "none" }}>Get Started</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
