import ReadinessAssessment from '@/src/components/m1/ReadinessAssessment';
import BudgetGapCalculator from '@/src/components/m1/BudgetGapCalculator';

export default function M1Page() {
  return (
    <main style={{ backgroundColor: "#FAF8F2", minHeight: "100vh", padding: "60px 24px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <p style={{ color: "#C8A96E", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase" }}>Module 1</p>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "2.5rem", margin: "12px 0 24px" }}>Permission to Explore</h1>
        <p style={{ color: "rgba(27,42,74,0.7)", fontSize: "1.1rem", lineHeight: 1.8, marginBottom: "48px" }}>
        Before you can plan your financial future, you need a clear picture of where you stand today. This module gives you the tools to begin — at your own pace, on your own terms.
        </p>
        <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "40px", marginBottom: "32px", boxShadow: "0 2px 12px rgba(27,42,74,0.08)" }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "1.5rem", marginBottom: "16px" }}>Life Transition Readiness Assessment</h2>
          <p style={{ color: "rgba(27,42,74,0.7)", marginBottom: "24px" }}>Answer 10 questions to understand where you are in your journey.</p>
          <ReadinessAssessment />
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "8px", padding: "40px", boxShadow: "0 2px 12px rgba(27,42,74,0.08)" }}>
          <h2 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "1.5rem", marginBottom: "16px" }}>Budget Gap Calculator</h2>
          <p style={{ color: "rgba(27,42,74,0.7)", marginBottom: "24px" }}>See the difference between your current household income and what you would need on your own.</p>
          <BudgetGapCalculator />
        </div>
      </div>
    </main>
  )
}
