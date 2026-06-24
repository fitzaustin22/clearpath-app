// PUBLIC, unauthenticated report-capture for the Military Pension Value Tool
// (whitelisted in src/proxy.ts). Persists the EMAIL ONLY; generates the snapshot
// PDF from the audited getCalc and emails it via Resend. Stores neither the
// toolInputs nor the PDF. Carries its own anti-abuse: size cap, honeypot, per-IP
// throttle. Node runtime — @react-pdf must render in Node (not edge).
import { NextResponse } from "next/server";
import { handleReportRequest } from "@/src/lib/military-pension/funnel/sendReport";
import { upsertLead } from "@/src/lib/military-pension/funnel/leadStore";
import { isSuppressed } from "@/src/lib/military-pension/funnel/suppression";
import { sendReportEmail } from "@/src/lib/military-pension/funnel/resendClient";
import { getCalc } from "@/src/lib/military-pension/getCalc";
import { generatePensionSnapshotPdf } from "@/src/lib/military-pension/snapshot-pdf/generatePensionSnapshotPdf";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20_000;
const RL_WINDOW_MS = 60_000;
const RL_MAX = 5;
const hits = new Map<string, number[]>();

function throttled(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < RL_WINDOW_MS);
  if (recent.length >= RL_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function preparedDate(): string {
  return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  if (throttled(ip)) {
    return NextResponse.json({ error: "Too many requests — please try again shortly." }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, toolInputs, website } = body ?? {};

  // Honeypot — a real user never fills `website`. Bots that do get a silent 200.
  if (typeof website === "string" && website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }
  if (!toolInputs || typeof toolInputs !== "object") {
    return NextResponse.json({ error: "Missing tool inputs." }, { status: 400 });
  }

  try {
    const result = await handleReportRequest(
      { email: email as string, toolInputs: toolInputs as object },
      {
        upsertLead,
        isSuppressed,
        getCalc,
        generatePdf: ({ inp, calc }: { inp: object; calc: object }) =>
          generatePensionSnapshotPdf({ inp, calc, preparedDate: preparedDate() }),
        sendReportEmail,
      },
    );
    if (!result.ok) {
      return NextResponse.json({ error: result.error || "Could not process request." }, { status: result.status || 400 });
    }
    // Suppressed and sent both succeed from the caller's perspective.
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("military-pension-report failed:", err);
    return NextResponse.json({ error: "Could not send the report. Please try again later." }, { status: 502 });
  }
}
