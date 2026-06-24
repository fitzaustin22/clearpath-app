// Resend send wrapper. Sends the snapshot PDF with an honest from/subject and a
// CAN-SPAM-compliant footer (clear sender, physical address, working unsubscribe
// link built from the HMAC token). Reads all credentials/identity from env — no
// live send happens until those are provisioned.
//
// ENV REQUIRED before any live send (provisioned by Fitz):
//   RESEND_API_KEY            — Resend secret
//   RESEND_FROM               — verified sender, e.g. "ClearPath <reports@your-domain>"
//   UNSUBSCRIBE_SECRET        — HMAC secret for unsubscribe tokens
//   NEXT_PUBLIC_APP_URL       — base URL for the unsubscribe link
//   CLEARPATH_MAILING_ADDRESS — full physical postal address (CAN-SPAM)
import { Resend } from 'resend';
import { signEmailToken } from './emailToken';

// Fallbacks are clearly-marked placeholders so the build/tests work; they are NOT
// production-ready identity. See summary "mock values".
const FROM = process.env.RESEND_FROM || 'ClearPath Divorce Financial <reports@clearpath.example>';
const SECRET = process.env.UNSUBSCRIBE_SECRET || 'dev-unsubscribe-secret';
const BASE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://app.clearpath.example').replace(/\/$/, '');
const MAILING_ADDRESS =
  process.env.CLEARPATH_MAILING_ADDRESS || 'ClearPath Divorce Financial LLC · Chantilly, VA';
const SUBJECT = 'Your Military Pension Value snapshot (educational estimate)';

function unsubscribeUrl(email) {
  return `${BASE_URL}/api/unsubscribe?u=${encodeURIComponent(signEmailToken(email, SECRET))}`;
}

function emailText(unsubUrl) {
  return [
    'Thanks for using the ClearPath Military Pension Value Tool.',
    '',
    'Your snapshot is attached as a PDF — the gross monthly pension, your marital',
    "(coverture) share, a present-value range, and the questions to bring to your attorney.",
    '',
    'This is an educational estimate, not legal or financial advice. Your state and your',
    'specific facts change these numbers — talk to a CDFA® and a family-law attorney.',
    '',
    '— ClearPath Divorce Financial LLC',
    MAILING_ADDRESS,
    '',
    `Unsubscribe: ${unsubUrl}`,
  ].join('\n');
}

function emailHtml(unsubUrl) {
  return `<!doctype html><html><body style="font-family:Inter,Arial,sans-serif;color:#1B2A4A;line-height:1.6;max-width:560px;margin:0 auto;padding:8px 4px">
  <p>Thanks for using the <strong>ClearPath Military Pension Value Tool</strong>.</p>
  <p>Your snapshot is attached as a PDF — the gross monthly pension, your marital (coverture) share, a present-value range, and the questions to bring to your attorney.</p>
  <p style="color:#4A5876;font-size:13px">This is an educational estimate, not legal or financial advice. Your state and your specific facts change these numbers — talk to a CDFA® and a family-law attorney.</p>
  <hr style="border:none;border-top:1px solid #E6E2D8;margin:20px 0" />
  <p style="color:#8A93A8;font-size:12px;margin:0">ClearPath Divorce Financial LLC<br/>${MAILING_ADDRESS}<br/>
  You received this because you requested a report at the ClearPath Military Pension Value Tool.
  <a href="${unsubUrl}" style="color:#8A7028">Unsubscribe</a>.</p>
  </body></html>`;
}

export async function sendReportEmail({ email, pdfBuffer }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured — cannot send.');
  const resend = new Resend(apiKey);
  const unsubUrl = unsubscribeUrl(email);
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: SUBJECT,
    html: emailHtml(unsubUrl),
    text: emailText(unsubUrl),
    attachments: [{ filename: 'ClearPath-Military-Pension-Snapshot.pdf', content: pdfBuffer }],
    headers: { 'List-Unsubscribe': `<${unsubUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
  });
  if (error) throw new Error(typeof error === 'string' ? error : error.message || 'Resend send failed');
}
