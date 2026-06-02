import { Show, UserButton } from "@clerk/nextjs";
import BlueprintBarWrapper from "@/src/components/blueprint/BlueprintBarWrapper";
import { T } from "@/src/lib/brand/tokens";

// Navy authenticated-app chrome, lifted from the old root layout so it now wraps
// ONLY the app route group, not marketing pages. Hex literals that map 1:1 to a
// brand token use T.* (NAVY = #1B2A4A, GOLD = #C8A96E); the footer text color
// rgba(255,255,255,0.5) has no exact T equivalent and is left literal (flagged
// for a later tokenize pass). The Playfair logo font stays as the app heading
// stack (no 1:1 T token — T.FONT_DISPLAY is Newsreader). The <a> nav links are
// kept as-is from the lift (their no-html-link-for-pages lint notes are the
// baseline's, relocated from the old root layout).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="blueprint-export-hide flex flex-col gap-3 items-start sm:flex-row sm:gap-0 sm:justify-between sm:items-center"
        style={{ backgroundColor: T.NAVY, padding: "16px 20px" }}
      >
        <a href="/" style={{ color: T.GOLD, fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.4rem", textDecoration: "none", fontWeight: 700 }}>ClearPath</a>
        <div className="flex gap-3 items-center flex-wrap">
          <Show when="signed-out">
            <a href="/login" style={{ border: `1px solid ${T.GOLD}`, color: T.GOLD, padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}>Sign In</a>
            <a href="/signup" style={{ backgroundColor: T.GOLD, color: T.NAVY, padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>Sign Up Free</a>
          </Show>
          <Show when="signed-in">
            <UserButton />
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
