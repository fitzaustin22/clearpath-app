import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '@/src/lib/supabase/server'
import { hasAccess, type UserTier } from '@/src/lib/plans'

const MODULES: { key: string; title: string; tier: UserTier }[] = [
  { key: "m1", title: "Permission to Explore", tier: "free" },
  { key: "m2", title: "Know What You Own", tier: "essentials" },
  { key: "m3", title: "Know What You Spend", tier: "essentials" },
  { key: "m4", title: "Tax Landscape", tier: "navigator" },
  { key: "m5", title: "Value What Matters", tier: "navigator" },
  { key: "m6", title: "Negotiate from Strength", tier: "navigator" },
  { key: "m7", title: "ClearPath Financial Blueprint", tier: "signature" },
]

export default async function DashboardPage() {
  const { userId } = await auth()

  let userTier: UserTier = 'free'
  if (userId) {
    const { data } = await supabaseAdmin
      .from('users')
      .select('tier')
      .eq('id', userId)
      .single()

    if (data?.tier) {
      userTier = data.tier as UserTier
    }
  }

  const tierLabel = userTier.charAt(0).toUpperCase() + userTier.slice(1)

  return (
    <main style={{ backgroundColor: "#FAF8F2", minHeight: "100vh", padding: "60px 24px" }}>
      <div style={{ maxWidth: "900px", margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "2rem", marginBottom: "8px" }}>Your Dashboard</h1>
        <span style={{ backgroundColor: "#1B2A4A", color: "#C8A96E", padding: "4px 12px", borderRadius: "20px", fontSize: "0.85rem", fontWeight: 700 }}>{tierLabel}</span>
        <h2 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "1.3rem", margin: "40px 0 24px" }}>Your Modules</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "20px" }}>
          {MODULES.map((mod) => {
            const isLocked = !hasAccess(userTier, mod.tier)
            return (
              <div key={mod.key} style={{ backgroundColor: "white", borderRadius: "8px", padding: "28px", boxShadow: "0 2px 8px rgba(27,42,74,0.07)", opacity: isLocked ? 0.7 : 1 }}>
                <span style={{ fontSize: "0.8rem", color: "#C8A96E", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px" }}>{mod.key.toUpperCase()}</span>
                <h3 style={{ fontFamily: "Playfair Display, serif", color: "#1B2A4A", fontSize: "1.1rem", margin: "12px 0 20px" }}>{mod.title}</h3>
                {isLocked
                  ? <a href="/upgrade" style={{ display: "block", textAlign: "center", border: "1px solid #C8A96E", color: "#C8A96E", padding: "10px", borderRadius: "4px", textDecoration: "none", fontSize: "0.9rem" }}>Upgrade to unlock</a>
                  : <a href={"/modules/" + mod.key} style={{ display: "block", textAlign: "center", backgroundColor: "#C8A96E", color: "#1B2A4A", padding: "10px", borderRadius: "4px", textDecoration: "none", fontWeight: 700, fontSize: "0.9rem" }}>Continue</a>
                }
              </div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
