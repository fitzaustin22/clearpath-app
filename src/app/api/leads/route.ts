import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/src/lib/supabase/server";

// PUBLIC, unauthenticated lead-magnet capture. This route is whitelisted in
// src/proxy.ts (isPublicRoute) so signed-out visitors can POST. Because it is
// unauthenticated, it carries its own basic anti-abuse: a payload-size cap, a
// honeypot field, strict input validation, and a magnet allowlist. Writes go
// through supabaseAdmin (service role, bypasses RLS) — mirroring the Stripe
// route — into public.leads.

const MAGNET_ALLOWLIST = ["financial-clarity-checklist"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254; // RFC 5321 practical ceiling
const MAX_SOURCE = 100;
const MAX_BODY_BYTES = 10_000;

export async function POST(request: Request) {
  try {
    // Reject oversized payloads before parsing.
    const declaredLen = Number(request.headers.get("content-length") ?? 0);
    if (declaredLen > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { email, magnetId, source, website } = (body ?? {}) as Record<string, unknown>;

    // Honeypot: a real user never fills `website`. Bots that do get a silent 200
    // (we drop the submission without persisting and without signalling anything).
    if (typeof website === "string" && website.trim() !== "") {
      return NextResponse.json({ ok: true });
    }

    // Validate email.
    if (typeof email !== "string" || email.length > MAX_EMAIL || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }
    // Validate magnet id against the allowlist.
    if (typeof magnetId !== "string" || !MAGNET_ALLOWLIST.includes(magnetId)) {
      return NextResponse.json({ error: "Unknown magnet." }, { status: 400 });
    }
    // Optional capture source, length-capped.
    const src = typeof source === "string" ? source.slice(0, MAX_SOURCE) : null;

    // Email normalized to lower-case: a plain unique(email, magnet_id) then gives
    // case-insensitive dedupe AND matches the ON CONFLICT (email, magnet_id) target.
    const { error } = await supabaseAdmin.from("leads").upsert(
      {
        email: email.trim().toLowerCase(),
        magnet_id: magnetId,
        source: src,
        consent_at: new Date().toISOString(),
      },
      { onConflict: "email,magnet_id", ignoreDuplicates: true },
    );

    if (error) {
      console.error("[leads] insert failed:", error.message);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    // (Deferred) A best-effort ConvertKit subscribe could be fired here later
    // without blocking this response — intentionally NOT wired this cycle.

    // Always 200 on valid input (duplicates are ignored above) so we never leak
    // whether an email is already on the list.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[leads] error:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
