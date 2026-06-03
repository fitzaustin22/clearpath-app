"use client";
import { useState } from "react";
import { T } from "@/src/lib/brand/tokens";

// Placeholder magnet — Fitz swaps in the real asset. `href` 404s until the PDF
// is dropped at public/lead-magnets/ (intentionally absent this cycle).
const MAGNET = {
  id: "financial-clarity-checklist",
  title: "The Financial Clarity Checklist",
  href: "/lead-magnets/financial-clarity-checklist.pdf",
};

// Mirror the server-side check so users get instant feedback before the POST.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function CheckBadge() {
  return (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={T.GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

export default function LeadMagnetForm() {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — bots fill it, humans never see it
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [hover, setHover] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmed,
          magnetId: MAGNET.id,
          source: "homepage-checklist",
          website, // honeypot — server silently drops if non-empty
        }),
      });
      if (!res.ok) throw new Error("request failed");
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div style={{ maxWidth: "560px", margin: "0 auto", textAlign: "center" }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "16px" }}>
          <CheckBadge />
        </div>
        <p style={{ fontFamily: T.FONT_DISPLAY, fontSize: "1.5rem", fontWeight: 700, color: "rgba(255,255,255,1)", margin: "0 0 8px" }}>
          You&rsquo;re all set
        </p>
        <p style={{ fontFamily: T.FONT_BODY, color: "rgba(255,255,255,0.8)", fontSize: "1rem", lineHeight: 1.6, margin: "0 0 24px" }}>
          Your copy of {MAGNET.title} is ready.
        </p>
        <a
          href={MAGNET.href}
          download
          style={{
            display: "inline-block",
            fontFamily: T.FONT_BODY,
            backgroundColor: T.GOLD,
            color: T.NAVY,
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            padding: "16px 32px",
            borderRadius: "8px",
          }}
        >
          Download the Checklist
        </a>
      </div>
    );
  }

  const submitting = status === "submitting";

  return (
    <form onSubmit={onSubmit} noValidate style={{ maxWidth: "560px", margin: "0 auto" }}>
      {/* Honeypot: visually hidden, off-tab, ignored by humans. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        style={{ position: "absolute", left: "-9999px", width: "1px", height: "1px", opacity: 0 }}
      />

      <div className="flex flex-col sm:flex-row" style={{ gap: "16px" }}>
        <input
          type="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email Address"
          aria-label="Email address"
          className="placeholder:text-white/55"
          style={{
            flexGrow: 1,
            fontFamily: T.FONT_BODY,
            fontSize: "1rem",
            color: "rgba(255,255,255,1)",
            backgroundColor: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "8px",
            padding: "16px 20px",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
        <button
          type="submit"
          disabled={submitting}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            fontFamily: T.FONT_BODY,
            backgroundColor: T.GOLD,
            color: T.NAVY,
            fontWeight: 700,
            fontSize: "1rem",
            border: "none",
            borderRadius: "8px",
            padding: "16px 28px",
            whiteSpace: "nowrap",
            cursor: submitting ? "wait" : "pointer",
            opacity: submitting ? 0.7 : hover ? 0.9 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {submitting ? "Sending…" : "Send My Checklist"}
        </button>
      </div>

      {status === "error" ? (
        <p role="alert" style={{ fontFamily: T.FONT_BODY, color: "#FBD5CE", fontSize: "0.85rem", margin: "12px 0 0" }}>
          {error}
        </p>
      ) : null}

      <p style={{ fontFamily: T.FONT_BODY, color: "rgba(255,255,255,0.45)", fontSize: "0.75rem", margin: "24px 0 0" }}>
        Privacy matters. Your information is never shared.
      </p>
    </form>
  );
}
