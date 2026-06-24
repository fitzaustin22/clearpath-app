import type { Metadata } from "next";
import MilitaryPensionTool from "@/src/components/military-pension/MilitaryPensionTool";

export const metadata: Metadata = {
  title: "Military Pension Value Tool — ClearPath",
  description:
    "A free, educational estimate of what a U.S. military pension is worth in a divorce — the gross monthly benefit, your marital (coverture) share, and a present-value range. Educational only, not legal advice.",
};

// Public marketing lead-magnet. The interactive calculator is a client island
// (MilitaryPensionTool); this server page only provides the route + metadata and
// inherits SiteNav/SiteFooter from the (marketing) layout. Stores no PII.
export default function MilitaryPensionValuePage() {
  return (
    <main>
      <MilitaryPensionTool />
    </main>
  );
}
