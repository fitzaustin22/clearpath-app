import { ClerkProvider } from "@clerk/nextjs";
import { Playfair_Display, Source_Sans_3, Newsreader, Inter } from "next/font/google";
import ToastContainer from "@/src/components/shared/ToastContainer";
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

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = { title: "ClearPath for Women", description: "Divorce financial education and planning" };

// Shared shell only — html/body/fonts + ClerkProvider + global ToastContainer.
// The navy app chrome now lives in (app)/layout.tsx; the marketing nav/footer
// live in (marketing)/layout.tsx. Root must stay chrome-free.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${sourceSans.variable} ${newsreader.variable} ${inter.variable}`}>
      <body style={{ margin: 0, backgroundColor: "#FAF8F2", fontFamily: "var(--font-source-sans), 'Source Sans Pro', sans-serif" }}>
        <ClerkProvider signInUrl="/login" signUpUrl="/signup" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard">
          {children}
          <ToastContainer />
        </ClerkProvider>
      </body>
    </html>
  );
}
