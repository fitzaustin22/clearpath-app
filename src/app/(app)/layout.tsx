import { Show, UserButton } from "@clerk/nextjs";
import BlueprintBarWrapper from "@/src/components/blueprint/BlueprintBarWrapper";
import PrimaryNav from "@/src/components/chrome/PrimaryNav";
import MobileNav from "@/src/components/chrome/MobileNav";
import { T } from "@/src/lib/brand/tokens";

// Navy authenticated-app chrome. Hosts the primary nav (Dashboard / Modules /
// Blueprint) for signed-in users: a true-centered 1fr·auto·1fr grid on desktop
// (md+), collapsing to a navy slide-down sheet on mobile (<768px). The center
// grid cell is ALWAYS rendered (even when empty for signed-out visitors on public
// routes) so the grid never collapses to 2 columns and shifts the right cluster;
// the nav is gated inside it via Clerk <Show>. Forward-compat: a 4th "Resources"
// link just widens the auto center column — the 1fr side columns keep it centered.
//
// PrimaryNav / MobileNav are client islands ('use client', usePathname); this
// layout stays a Server Component (Clerk + Supabase reads elsewhere unchanged).
// Hex literals that map 1:1 to a brand token use T.* (NAVY, GOLD); the bottom
// hairline rgba(200,169,110,0.14) has no exact T equivalent (left literal). The
// `blueprint-export-hide` class MUST stay — it strips the chrome from the
// Blueprint PDF export. The wordmark and signed-out Sign In / Sign Up links are
// kept verbatim from the prior chrome (their no-html-link-for-pages lint notes
// are the baseline's); the new nav links use next/link and add no lint errors.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="blueprint-export-hide flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr]"
        style={{ backgroundColor: T.NAVY, height: 72, paddingInline: 32, borderBottom: "1px solid rgba(200, 169, 110, 0.14)" }}
      >
        {/* Left cell: wordmark (unchanged) */}
        <a href="/" style={{ color: T.GOLD, fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.4rem", textDecoration: "none", fontWeight: 700, justifySelf: "start" }}>ClearPath</a>

        {/* Center cell: always present (keeps the grid stable); primary nav shown
            for signed-in users on desktop only. */}
        <div className="hidden md:flex justify-center">
          <Show when="signed-in">
            <PrimaryNav />
          </Show>
        </div>

        {/* Right cell: auth controls */}
        <div className="flex gap-3 items-center" style={{ justifySelf: "end" }}>
          <Show when="signed-out">
            <a href="/login" style={{ border: `1px solid ${T.GOLD}`, color: T.GOLD, padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}>Sign In</a>
            <a href="/signup" style={{ backgroundColor: T.GOLD, color: T.NAVY, padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>Sign Up Free</a>
          </Show>
          <Show when="signed-in">
            <MobileNav className="md:hidden" />
            {/* 34px gold-border wrapper around the Clerk UserButton — Clerk's
                component itself is untouched; this is a styled sibling div. */}
            <div style={{ width: 34, height: 34, border: `1px solid ${T.GOLD}`, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <UserButton />
            </div>
          </Show>
        </div>
      </header>
      <BlueprintBarWrapper>{children}</BlueprintBarWrapper>
      <footer className="blueprint-export-hide" style={{ backgroundColor: T.NAVY, color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "24px", fontSize: "0.8rem" }}>
        ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice.
      </footer>
    </>
  );
}
