const FEATURES = [
  { title: "Financial Clarity", body: "Understand exactly where you stand — assets, income, expenses, and what is at stake." },
  { title: "Expert Guidance", body: "CDFA-designed curriculum built specifically for women navigating financial transition." },
  { title: "Your Pace", body: "Self-guided tools and education that work around your life, available 24/7." },
]

export default function Home() {
  return (
    <div>
      <section style={{ backgroundColor: "#1B2A4A", padding: "80px 24px", textAlign: "center" }}>
        <p style={{ color: "#C8A96E", fontSize: "13px", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "16px" }}>ClearPath for Women</p>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: "#C8A96E", fontSize: "3rem", fontWeight: 700, maxWidth: "800px", margin: "0 auto 24px" }}>Your Financial Future Starts with Clarity</h1>
        <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "1.2rem", maxWidth: "600px", margin: "0 auto 40px" }}>ClearPath guides women through the financial side of life's biggest transitions.</p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a href="/signup" style={{ backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "14px 32px", borderRadius: "4px", fontWeight: 700, textDecoration: "none" }}>Get Started Free</a>
          <a href="/modules/m1" style={{ border: "2px solid #C8A96E", color: "#C8A96E", padding: "14px 32px", borderRadius: "4px", fontWeight: 700, textDecoration: "none" }}>Learn More</a>
        </div>
      </section>
      <section style={{ backgroundColor: "#FAF8F2", padding: "80px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "40px", maxWidth: "1000px", margin: "0 auto" }}>
          {FEATURES.map((f) => (
            <div key={f.title}>
              <div style={{ width: "40px", height: "4px", backgroundColor: "#C8A96E", marginBottom: "16px" }} />
              <h3 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "1.4rem", marginBottom: "12px" }}>{f.title}</h3>
              <p style={{ color: "rgba(27,42,74,0.7)", lineHeight: 1.7 }}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
