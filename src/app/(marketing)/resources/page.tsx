import ResourcesHero from "@/src/components/marketing/ResourcesHero";
import ResourcesLibrary from "@/src/components/marketing/ResourcesLibrary";

export const metadata = {
  title: "Resources — ClearPath",
  description:
    "Free divorce-financial guides, worksheets, and calculators — no account, no email required. The same tools built into the early steps of ClearPath, shared openly.",
};

// Server Component — composes the resources hero + library. The (marketing)
// layout owns SiteNav + SiteFooter and a paddingTop wrapper, so this page owns
// its own <main>. Kept sync (not async): there is nothing to await, and an
// async page component cannot be rendered by the React Testing Library smoke
// test in jsdom.
export default function ResourcesPage() {
  return (
    <main>
      <ResourcesHero />
      <ResourcesLibrary />
    </main>
  );
}
