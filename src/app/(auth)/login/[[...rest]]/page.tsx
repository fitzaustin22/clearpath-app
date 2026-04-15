import { SignIn } from "@clerk/nextjs";
export default function SignInPage() {
  return (
    <main style={{ backgroundColor: "#FAF8F2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <SignIn fallbackRedirectUrl="/dashboard" forceRedirectUrl="/dashboard" />
    </main>
  );
}
