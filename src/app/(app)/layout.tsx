import { Show, UserButton } from "@clerk/nextjs";
import BlueprintBarWrapper from "@/src/components/blueprint/BlueprintBarWrapper";

// Navy authenticated-app chrome, lifted verbatim from the old root layout so it
// now wraps ONLY the app route group, not marketing pages.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="blueprint-export-hide flex flex-col gap-3 items-start sm:flex-row sm:gap-0 sm:justify-between sm:items-center"
        style={{ backgroundColor: "#1B2A4A", padding: "16px 20px" }}
      >
        <a href="/" style={{ color: "#C8A96E", fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.4rem", textDecoration: "none", fontWeight: 700 }}>ClearPath</a>
        <div className="flex gap-3 items-center flex-wrap">
          <Show when="signed-out">
            <a href="/login" style={{ border: "1px solid #C8A96E", color: "#C8A96E", padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}>Sign In</a>
            <a href="/signup" style={{ backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>Sign Up Free</a>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>
      <BlueprintBarWrapper>{children}</BlueprintBarWrapper>
      <footer className="blueprint-export-hide" style={{ backgroundColor: "#1B2A4A", color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "24px", fontSize: "0.8rem" }}>
        ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice.
      </footer>
    </>
  );
}
