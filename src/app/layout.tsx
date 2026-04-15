import { ClerkProvider, UserButton } from "@clerk/nextjs";
import { Playfair_Display, Source_Sans_3 } from "next/font/google";
import BlueprintBarWrapper from "@/src/components/blueprint/BlueprintBarWrapper";
import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-source-sans",
  display: "swap",
});

export const metadata = { title: "ClearPath for Women", description: "Divorce financial education and planning" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable}`}>
      <body style={{ margin: 0, backgroundColor: "#FAF8F2", fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif" }}>
        <ClerkProvider signInUrl="/login" signUpUrl="/signup" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
          <header
            className="flex flex-col gap-3 items-start sm:flex-row sm:gap-0 sm:justify-between sm:items-center"
            style={{ backgroundColor: "#1B2A4A", padding: "16px 20px" }}
          >
            <a href="/" style={{ color: "#C8A96E", fontFamily: "var(--font-playfair), 'Playfair Display', serif", fontSize: "1.4rem", textDecoration: "none", fontWeight: 700 }}>ClearPath</a>
            <div className="flex gap-3 items-center flex-wrap">
              <a href="/login" style={{ border: "1px solid #C8A96E", color: "#C8A96E", padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}>Sign In</a>
              <a href="/signup" style={{ backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "8px 20px", borderRadius: "4px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>Sign Up Free</a>
            </div>
          </header>
          <BlueprintBarWrapper>{children}</BlueprintBarWrapper>
          <footer style={{ backgroundColor: "#1B2A4A", color: "rgba(255,255,255,0.5)", textAlign: "center", padding: "24px", fontSize: "0.8rem" }}>
            ClearPath Divorce Financial LLC is not a law firm and does not provide legal advice.
          </footer>
        </ClerkProvider>
      </body>
    </html>
  );
}
