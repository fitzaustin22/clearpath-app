"use client";
import { useEffect, useRef } from "react";
import { T } from "@/src/lib/brand/tokens";

/**
 * BlueprintFlipbook — the hero's right-column "Financial Blueprint" flip-book.
 *
 * Three stacked document "pages" (Financial Blueprint summary → 12-stop Journey
 * timeline → Path Forward outcome) styled as printed reports on tan graph paper,
 * with a floating gold "clarity stat" card overlay. The pages turn by a
 * SCROLL-SCRUBBED page-flip: while the window is at the very top, wheel/touch/
 * keyboard scroll is consumed and converted into flip progress instead of moving
 * the page; once both pages have flipped, normal scrolling resumes. Reversible,
 * re-engaging, eased via rAF, and disabled entirely under prefers-reduced-motion.
 *
 * Per the design handoff (faithful implementation). The whole illustration is
 * aria-hidden (decorative); the page's real value props live in the copy/sections.
 */

// Graph-paper texture: GOLD (#C8A96E = 200,169,110) at low alpha — fine 16px grid
// + major 80px grid. Decorative rgba (not a brand hex); no T token at these alphas.
const GRID_MINOR = "rgba(200, 169, 110, 0.07)";
const GRID_MAJOR = "rgba(200, 169, 110, 0.16)";

const docBase = {
  backgroundColor: T.CARD,
  backgroundImage: `linear-gradient(to right, ${GRID_MAJOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_MAJOR} 1px, transparent 1px), linear-gradient(to right, ${GRID_MINOR} 1px, transparent 1px), linear-gradient(to bottom, ${GRID_MINOR} 1px, transparent 1px)`,
  backgroundSize: "80px 80px, 80px 80px, 16px 16px, 16px 16px",
  border: `1px solid ${T.LINE}`,
  borderRadius: "6px",
  boxShadow: T.SHADOW_LIFT,
  transformOrigin: "top center",
  backfaceVisibility: "hidden",
  WebkitBackfaceVisibility: "hidden",
  willChange: "transform",
};

const eyebrowStyle = { fontSize: "0.62rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: T.GOLD, marginBottom: "12px" };
const titleStyle = { fontFamily: T.FONT_DISPLAY, color: T.NAVY, fontSize: "1.92rem", fontWeight: 600, lineHeight: 1.08, letterSpacing: "-0.01em", margin: 0 };
const ruleStyle = { width: "60px", height: "2px", backgroundColor: T.GOLD, margin: "16px 0 18px" };
const metaPf = { fontSize: "0.92rem", color: T.NAVY, fontWeight: 500 };
const metaGen = { fontSize: "0.74rem", color: T.MUTED };

function Row({ lbl, val, first }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "14px", padding: "11px 0", borderTop: first ? "none" : `1px solid ${T.LINE}` }}>
      <span style={{ fontSize: "0.82rem", color: T.NAVY_70 }}>{lbl}</span>
      <span style={{ ...T.NUMERIC_STYLE, fontSize: "1.06rem", fontWeight: 600, color: T.NAVY, whiteSpace: "nowrap" }}>{val}</span>
    </div>
  );
}

function SplitBar({ you, other, youLabel, otherLabel }) {
  return (
    <div style={{ marginTop: "22px" }}>
      <div style={{ display: "flex", height: "9px", borderRadius: "9999px", overflow: "hidden" }}>
        <span style={{ width: `${you}%`, backgroundColor: T.GOLD }} />
        <span style={{ width: `${other}%`, backgroundColor: T.NAVY_12 }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "14px", marginTop: "9px", fontSize: "0.68rem", color: T.NAVY_55, letterSpacing: "0.04em", textTransform: "uppercase", fontWeight: 600 }}>
        <span>{youLabel} &middot; {you}%</span>
        <span>{otherLabel} &middot; {other}%</span>
      </div>
    </div>
  );
}

// Compliance: an illustrative-sample disclaimer shown on every flip-book page that
// displays dollar figures (Pages 1 and 3) so the mock can never read as a real
// deliverable or a projection of results.
const stampStyle = {
  marginTop: "18px",
  fontSize: "0.6rem",
  lineHeight: 1.4,
  letterSpacing: "0.02em",
  fontWeight: 700,
  color: T.NAVY,
  backgroundColor: GRID_MAJOR, // gold @ 16% tint (same as the graph-paper major lines)
  border: `1px solid ${T.GOLD_BORDER}`,
  borderRadius: "6px",
  padding: "8px 11px",
  textWrap: "balance",
};

function BpStamp() {
  return (
    <div style={stampStyle}>
      Illustrative example &mdash; sample figures, not a real client or a projection of results.
    </div>
  );
}

const ROWS1 = [
  { lbl: "Marital estate", val: "$1,200,000" },
  { lbl: "Your proposed share", val: "$600,000" },
  { lbl: "Retirement (QDRO) split", val: "$280,000" },
  { lbl: "House buyout amount", val: "$300,000" },
  { lbl: "Monthly living need", val: "$4,000" },
];

const ROWS3 = [
  { lbl: "Cash at closing", val: "$300,000" },
  { lbl: "Retained retirement", val: "$280,000" },
  { lbl: "Monthly support", val: "$2,000" },
  { lbl: "Emergency runway", val: "14 months" },
];

// 12-stop journey: 4 phase dividers + 12 stops. `seg` = rail style above the row
// (solid gold up to the current stop, dotted after; the last stop has no rail).
const JOURNEY = [
  { kind: "phase", label: "Foundation", desc: "Where you stand", dot: T.NAVY, seg: "gold" },
  { kind: "stop", num: "1", sec: "§1", name: "Personal Profile", state: "done", seg: "gold" },
  { kind: "stop", num: "2", sec: "§2", name: "Income", state: "done", seg: "gold" },
  { kind: "stop", num: "3", sec: "§3", name: "Assets", state: "done", seg: "gold" },
  { kind: "phase", label: "Analysis", desc: "What's at stake", dot: T.GOLD, seg: "gold" },
  { kind: "stop", num: "4", sec: "§4", name: "Tax Analysis", state: "current", seg: "dot", here: true },
  { kind: "stop", num: "5", sec: "§5", name: "Property", state: "next", seg: "dot" },
  { kind: "stop", num: "6", sec: "§6", name: "Retirement", state: "upcoming", seg: "dot" },
  { kind: "phase", label: "Strategy", desc: "Build your case", dot: T.PILL_TEXT, seg: "dot" },
  { kind: "stop", num: "7", sec: "§7", name: "Expenses", state: "upcoming", seg: "dot" },
  { kind: "stop", num: "8", sec: "§8", name: "Support", state: "upcoming", seg: "dot" },
  { kind: "stop", num: "9", sec: "§9", name: "Home Decision", state: "upcoming", seg: "dot" },
  { kind: "phase", label: "Resolution", desc: "Move forward", dot: T.GREEN, seg: "dot" },
  { kind: "stop", num: "10", sec: "§10", name: "Negotiation", state: "upcoming", seg: "dot" },
  { kind: "stop", num: "11", sec: "§11", name: "Offers", state: "upcoming", seg: "dot" },
  { kind: "stop", num: "12", sec: "§12", name: "Action Plan", state: "upcoming", seg: "none", flag: true },
];

const nodeBase = {
  width: "20px",
  height: "20px",
  borderRadius: "50%",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  position: "relative",
  zIndex: 1,
  fontFamily: T.FONT_DISPLAY,
  fontVariantNumeric: "lining-nums",
  fontSize: "0.64rem",
  fontWeight: 700,
};

function nodeStyle(state) {
  if (state === "done") return { ...nodeBase, backgroundColor: T.GOLD, border: `1.5px solid ${T.GOLD}`, color: "#fff" };
  if (state === "current") return { ...nodeBase, backgroundColor: T.NAVY, border: `1.5px solid ${T.NAVY}`, color: "#fff", boxShadow: `0 0 0 3px ${T.NAVY_12}` };
  if (state === "next") return { ...nodeBase, backgroundColor: "#fff", border: `2px solid ${T.GOLD}`, color: T.GOLD };
  return { ...nodeBase, backgroundColor: "#fff", border: `1.5px solid ${T.LINE_STRONG}`, color: T.MUTED };
}

function NodeCheck() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function PennantFlag() {
  return (
    <svg style={{ marginLeft: "auto", flex: "none" }} width="11" height="13" viewBox="0 0 11 13" aria-hidden="true">
      <path d="M1 0v13" stroke={T.NAVY} strokeWidth="1.5" />
      <path d="M1.6 1h7l-2 2.5 2 2.5h-7z" fill={T.GOLD} />
    </svg>
  );
}

function JourneyTrack() {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {JOURNEY.map((item, i) => (
        <li key={i} style={{ position: "relative", display: "grid", gridTemplateColumns: "20px 1fr", alignItems: "center", columnGap: "11px", minHeight: item.kind === "phase" ? "18px" : "20px" }}>
          {item.seg !== "none" ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: "10px",
                top: 0,
                width: "2px",
                height: "100%",
                transform: "translateX(-50%)",
                zIndex: 0,
                background: item.seg === "gold" ? T.GOLD : `repeating-linear-gradient(to bottom, ${T.LINE_STRONG} 0 2px, transparent 2px 6px)`,
              }}
            />
          ) : null}

          {item.kind === "phase" ? (
            <>
              <span />
              <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: T.NAVY_55, whiteSpace: "nowrap" }}>
                <span style={{ width: "8px", height: "8px", borderRadius: "2px", flex: "none", backgroundColor: item.dot }} />
                {item.label} <span style={{ color: T.NAVY_38, fontWeight: 600, letterSpacing: "0.05em" }}>&middot; {item.desc}</span>
              </span>
            </>
          ) : (
            <>
              <span style={nodeStyle(item.state)}>{item.state === "done" ? <NodeCheck /> : item.num}</span>
              <span style={{ display: "flex", alignItems: "baseline", gap: "7px", minWidth: 0 }}>
                <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.06em", color: T.GOLD, flex: "none", fontVariantNumeric: "lining-nums" }}>{item.sec}</span>
                <span
                  style={{
                    fontSize: "0.78rem",
                    lineHeight: 1.2,
                    color: item.state === "done" || item.state === "current" ? T.NAVY : T.NAVY_55,
                    fontWeight: item.state === "done" || item.state === "current" ? 600 : 400,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.name}
                </span>
                {item.here ? (
                  <span style={{ marginLeft: "auto", flex: "none", fontSize: "0.5rem", fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", backgroundColor: T.NAVY, color: "#fff", padding: "2px 7px", borderRadius: "9999px" }}>
                    You are here
                  </span>
                ) : null}
                {item.flag ? <PennantFlag /> : null}
              </span>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}

export default function BlueprintFlipbook() {
  const flipRef = useRef(null);
  const baseRef = useRef(null);
  const midRef = useRef(null);
  const hintRef = useRef(null);

  useEffect(() => {
    const base = baseRef.current;
    const mid = midRef.current;
    const hint = hintRef.current;
    if (!base || !mid) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return; // static Page 1

    const DIST = 700; // px of scroll for a full two-page flip
    const MAX_ROT = 104; // degrees each page turns past its top edge
    let target = 0;
    let current = 0;
    let rafId = null;
    let lastY = null;

    const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

    const applyPage = (el, t) => {
      el.style.transform = `rotateX(${-MAX_ROT * t}deg)`;
      el.style.boxShadow =
        t > 0.004
          ? `0 ${(t * 44).toFixed(1)}px ${(t * 60).toFixed(1)}px rgba(27,42,74,${(0.06 + 0.18 * t).toFixed(3)})`
          : T.SHADOW_LIFT; // restore the resting elevation (inline, so cannot fall back to a CSS rule)
    };

    const render = (p) => {
      applyPage(base, clamp01(p / 0.6)); // Page 1 turns over progress 0 → 0.6
      applyPage(mid, clamp01((p - 0.4) / 0.6)); // Page 2 begins at 0.4, finishes at 1
      if (hint) hint.style.opacity = String(clamp01(1 - p * 5));
    };

    const tick = () => {
      current += (target - current) * 0.2;
      if (Math.abs(target - current) < 0.0005) current = target;
      render(current);
      rafId = current !== target ? requestAnimationFrame(tick) : null;
    };
    const schedule = () => {
      if (rafId == null) rafId = requestAnimationFrame(tick);
    };
    const nudge = (deltaPx) => {
      target = clamp01(target + deltaPx / DIST);
      schedule();
    };
    const atTop = () => window.pageYOffset <= 0;
    // Consume scroll only while there's a flip to scrub in that direction.
    const consumes = (d) => atTop() && ((d > 0 && target < 1) || (d < 0 && target > 0));

    const onWheel = (e) => {
      let d = e.deltaY;
      if (e.deltaMode === 1) d *= 16;
      else if (e.deltaMode === 2) d *= window.innerHeight;
      if (!consumes(d)) return;
      e.preventDefault();
      nudge(d);
    };
    const onTouchStart = (e) => {
      lastY = e.touches[0].clientY;
    };
    const onTouchMove = (e) => {
      if (lastY == null) return;
      const y = e.touches[0].clientY;
      const d = lastY - y;
      lastY = y;
      if (!consumes(d)) return;
      e.preventDefault();
      nudge(d);
    };
    const onKey = (e) => {
      // Minimal a11y guard (beyond the prototype): never hijack keys while the
      // user is operating a focused control (nav button, link, form field).
      const ae = document.activeElement;
      if (ae && ae !== document.body && /^(INPUT|TEXTAREA|SELECT|BUTTON|A)$/.test(ae.tagName)) return;
      let down;
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " " || e.key === "Spacebar") down = true;
      else if (e.key === "ArrowUp" || e.key === "PageUp") down = false;
      else return;
      const d = down ? 180 : -180;
      if (!consumes(d)) return;
      e.preventDefault();
      nudge(d);
    };

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false, capture: true });
    window.addEventListener("keydown", onKey, true);
    render(0);

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart, { capture: true });
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("keydown", onKey, true);
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "relative", width: "100%", paddingBottom: "30px" }}>
      {/* A second sheet peeking behind, implying a multi-page document. */}
      <div style={{ position: "absolute", inset: 0, backgroundColor: T.CARD, border: `1px solid ${T.LINE}`, borderRadius: "6px", boxShadow: T.SHADOW_CARD, transform: "rotate(3deg) translate(10px, 6px)", transformOrigin: "bottom right" }} />

      <div ref={flipRef} style={{ position: "relative", transform: "rotate(-1.4deg)", perspective: "1800px" }}>
        {/* Page 1 — Financial Blueprint (base) */}
        <div ref={baseRef} style={{ ...docBase, position: "relative", zIndex: 3, padding: "38px 36px 42px" }}>
          <div style={eyebrowStyle}>ClearPath for Women</div>
          <h3 style={titleStyle}>Financial Blueprint</h3>
          <div style={ruleStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "24px" }}>
            <span style={metaPf}>Prepared for Jane Sample.</span>
            <span style={metaGen}>Generated June 3, 2026</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ROWS1.map((r, i) => (
              <Row key={r.lbl} {...r} first={i === 0} />
            ))}
          </div>
          <SplitBar you={49} other={51} youLabel="Your share" otherLabel="Other party" />
          <BpStamp />
        </div>

        {/* Page 2 — Your Journey, 12-stop timeline (mid) */}
        <div ref={midRef} style={{ ...docBase, position: "absolute", inset: 0, zIndex: 2, padding: "28px 30px 24px", overflow: "hidden" }}>
          <div style={eyebrowStyle}>Your ClearPath</div>
          <h3 style={{ ...titleStyle, fontSize: "1.5rem" }}>Your Journey</h3>
          <div style={{ ...ruleStyle, margin: "12px 0" }} />
          <div style={{ fontSize: "0.74rem", color: T.NAVY_70, lineHeight: 1.3, margin: "0 0 13px" }}>
            3 of 12 stops reached &middot; 2 in progress &middot; readiness <b style={{ color: T.GOLD, fontWeight: 700 }}>Preparing</b>
          </div>
          <JourneyTrack />
        </div>

        {/* Page 3 — Your Path Forward (back) */}
        <div style={{ ...docBase, position: "absolute", inset: 0, zIndex: 1, padding: "38px 36px 42px" }}>
          <div style={eyebrowStyle}>Page 3 &middot; Outcome</div>
          <h3 style={titleStyle}>Your Path Forward</h3>
          <div style={ruleStyle} />
          <div style={{ display: "flex", flexDirection: "column", gap: "3px", marginBottom: "24px" }}>
            <span style={metaPf}>Recommended settlement</span>
            <span style={metaGen}>Modeled to age 67</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            {ROWS3.map((r, i) => (
              <Row key={r.lbl} {...r} first={i === 0} />
            ))}
          </div>
          <SplitBar you={57} other={43} youLabel="Secured" otherLabel="In progress" />
          <BpStamp />
        </div>
      </div>

      {/* "Scroll to turn the page" hint (fades as the flip is scrubbed). */}
      <div
        ref={hintRef}
        style={{ position: "absolute", right: "4px", bottom: 0, zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: T.NAVY_38, pointerEvents: "none", transition: "opacity .45s ease" }}
      >
        Scroll
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Floating clarity-stat card — persists across flips. */}
      <div style={{ position: "absolute", zIndex: 6, left: "-34px", bottom: 0, backgroundColor: T.CARD, border: `1px solid ${T.GOLD_BORDER}`, borderRadius: "10px", boxShadow: T.SHADOW_FLOAT, padding: "18px 22px", transform: "rotate(1.8deg)" }}>
        <div style={{ fontSize: "0.56rem", fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: T.GOLD, marginBottom: "6px" }}>Illustrative sample</div>
        <div style={{ ...T.NUMERIC_STYLE, color: T.GOLD, fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>
          $4,000
          <span style={{ fontFamily: T.FONT_BODY, fontSize: "0.8rem", fontWeight: 500, fontStyle: "italic", color: T.INK_2, marginLeft: "3px" }}>/mo</span>
        </div>
        <div style={{ width: "38px", height: "2px", backgroundColor: T.GOLD, margin: "9px 0 8px" }} />
        <div style={{ fontSize: "0.72rem", lineHeight: 1.35, color: T.NAVY_70, maxWidth: "13em" }}>What you&rsquo;ll need to live on &mdash; clear, at last.</div>
      </div>
    </div>
  );
}
