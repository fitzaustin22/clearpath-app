import { SignUp } from "@clerk/nextjs";
export default function SignUpPage() {
  return (
    <main style={{ backgroundColor: "#FAF8F2", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <SignUp fallbackRedirectUrl="/dashboard" />
    </main>
  );
}
