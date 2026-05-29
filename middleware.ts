import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/projects(.*)",
  "/links(.*)",
  "/settings(.*)",
  "/api/projects(.*)",
  "/api/ai(.*)",
  "/api/specs(.*)",
  "/api/interview/links(.*)",  // admin link creation requires auth
]);

// /interview/[token] and /api/interview/[token] are intentionally public

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
