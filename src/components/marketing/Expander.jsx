"use client";
import { useState } from "react";
import { T } from "@/src/lib/brand/tokens";

/**
 * Marketing "See what's included" disclosure used by the pricing cards.
 * Mirrors the Stitch expander: a label with a chevron that rotates 180° when
 * open, and a content area that expands smoothly (grid-template-rows 0fr → 1fr).
 */
export default function Expander({ label = "See what's included", accentColor = T.NAVY, children }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          background: "none",
          border: "none",
          padding: 0,
          cursor: "pointer",
          color: accentColor,
          fontFamily: T.FONT_BODY,
          fontSize: "0.875rem",
          fontWeight: 600,
        }}
      >
        {label}
        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "transform 0.3s ease", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <div
        style={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          marginTop: open ? "1rem" : 0,
          overflow: "hidden",
          transition: "grid-template-rows 0.3s ease-out, opacity 0.3s ease-out, margin 0.3s ease-out",
        }}
      >
        <div style={{ minHeight: 0 }}>{children}</div>
      </div>
    </div>
  );
}
