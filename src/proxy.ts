import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/signup(.*)",
  "/login(.*)",
  "/modules/m1(.*)",
  "/upgrade(.*)",
  "/pricing(.*)",
  "/api/webhooks(.*)",
  "/api/leads(.*)",
  // Military Pension Value Tool — public lead-magnet funnel (no Clerk auth):
  // the tool page, its report-capture POST, and the email unsubscribe link.
  "/military-pension-value(.*)",
  "/api/military-pension-report(.*)",
  "/api/unsubscribe(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
