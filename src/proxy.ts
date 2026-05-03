import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { nanoid } from "nanoid";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/share/(.*)",
  "/api/webhooks/(.*)",
  "/api/mcp/(.*)",
  "/api/v1/(.*)",
  "/api/v2/(.*)",
  "/openapi.json",
]);

const isBillingRoute = createRouteMatcher([
  "/settings/billing(.*)",
  "/settings(.*)",
  "/api/billing(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  // Attach a unique request ID for log correlation
  const requestId = req.headers.get("x-request-id") ?? nanoid(12);

  if (!isPublicRoute(req)) {
    await auth.protect();

    // Check subscription for non-billing routes
    if (!isBillingRoute(req)) {
      const { sessionClaims } = await auth();
      const orgData = sessionClaims?.o as any;
      const status = orgData?.slg ?? "FREE";

      // If cancelled or past_due → redirect to billing
      if (status === "cancelled" || status === "past_due") {
        return NextResponse.redirect(new URL("/settings/billing", req.url));
      }
    }
  }

  const res = NextResponse.next();
  res.headers.set("x-request-id", requestId);
  return res;
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};