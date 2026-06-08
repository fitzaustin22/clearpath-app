import AboutHero from "@/src/components/marketing/AboutHero";
import AboutMission from "@/src/components/marketing/AboutMission";
import AboutStandard from "@/src/components/marketing/AboutStandard";
import AboutContact from "@/src/components/marketing/AboutContact";

export const metadata = {
  title: "About — ClearPath",
  description:
    "ClearPath is a CDFA-grade divorce financial planning platform built for women. Know your numbers. Understand your options. Decide for yourself.",
};

// Server Component — composes the four editorial sections. The (marketing)
// layout owns SiteNav + SiteFooter and a paddingTop wrapper, so this page owns
// its own <main>.
export default function AboutPage() {
  return (
    <main>
      <AboutHero />
      <AboutMission />
      <AboutStandard />
      <AboutContact />
    </main>
  );
}
