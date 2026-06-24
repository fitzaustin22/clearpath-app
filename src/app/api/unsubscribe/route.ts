// PUBLIC unsubscribe link target (whitelisted in src/proxy.ts). Keyed on the
// signed HMAC token — no raw email in the URL, no auth. Adds the recovered email
// to public.email_suppressions, which the send path checks before every send.
import { handleUnsubscribe } from "@/src/lib/military-pension/funnel/unsubscribe";
import { addSuppression } from "@/src/lib/military-pension/funnel/suppression";

export const runtime = "nodejs";

function page(title: string, body: string, status: number): Response {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Inter,Arial,sans-serif;color:#1B2A4A;background:#FAF8F2;max-width:480px;margin:64px auto;padding:0 24px;line-height:1.6">
<h1 style="font-size:22px;margin:0 0 8px">${title}</h1>${body}</body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("u") || "";
  try {
    const r = await handleUnsubscribe(token, {
      secret: process.env.UNSUBSCRIBE_SECRET || "",
      addSuppression,
    });
    if (r.ok) {
      return page(
        "You're unsubscribed",
        "<p>You won't receive further ClearPath emails at this address. You can close this tab.</p>",
        200,
      );
    }
    return page("Invalid link", "<p>This unsubscribe link is invalid or has expired.</p>", 400);
  } catch (err) {
    console.error("unsubscribe failed:", err);
    return page("Something went wrong", "<p>Please try again later.</p>", 500);
  }
}
