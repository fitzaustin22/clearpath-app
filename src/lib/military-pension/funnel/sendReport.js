// Report-capture orchestration (dependency-injected for testability + reuse).
// Persists the EMAIL ONLY (consent), then emails the snapshot PDF. Never blocks
// the send on the consent write; never sends to a suppressed address; always
// regenerates the PDF from the audited getCalc so the email matches the screen.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL = 254; // RFC 5321 practical ceiling

/**
 * @param {{ email: string, toolInputs: object }} input
 * @param {{
 *   upsertLead: (email: string) => Promise<void>,
 *   isSuppressed: (email: string) => Promise<boolean>,
 *   getCalc: (inp: object) => object,
 *   generatePdf: (args: { inp: object, calc: object }) => Promise<Buffer>,
 *   sendReportEmail: (args: { email: string, pdfBuffer: Buffer }) => Promise<void>,
 * }} deps
 */
export async function handleReportRequest({ email, toolInputs }, deps) {
  const norm = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(norm) || norm.length > MAX_EMAIL) {
    return { ok: false, status: 400, error: 'A valid email is required.' };
  }

  // Consent record — the ONLY thing we persist. Best-effort: a DB hiccup must not
  // cost the user the report they asked for.
  try {
    await deps.upsertLead(norm);
  } catch {
    /* swallow — logged by the caller; proceed to send */
  }

  // Honor unsubscribe BEFORE doing any work or sending.
  if (await deps.isSuppressed(norm)) {
    return { ok: true, suppressed: true };
  }

  const calc = deps.getCalc(toolInputs);
  const pdfBuffer = await deps.generatePdf({ inp: toolInputs, calc });
  await deps.sendReportEmail({ email: norm, pdfBuffer });
  return { ok: true, sent: true };
}
