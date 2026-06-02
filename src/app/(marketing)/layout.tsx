import SiteNav from "@/src/components/marketing/SiteNav";
import SiteFooter from "@/src/components/marketing/SiteFooter";
import { T } from "@/src/lib/brand/tokens";

// Padding wrapper height MUST stay in sync with NAV_HEIGHT in SiteNav.jsx so
// content clears the fixed glass nav.
const NAV_HEIGHT = 72;

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteNav />
      {/* Padding wrapper (NOT a <main> — marketing pages own their own <main>). */}
      <div style={{ paddingTop: NAV_HEIGHT, backgroundColor: T.PARCHMENT }}>{children}</div>
      <SiteFooter />
    </>
  );
}
