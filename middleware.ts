import { authMiddleware } from "@clerk/nextjs";

export default authMiddleware({
  // Add these public routes so users can access them without signing in
  publicRoutes: [
    "/",                    // Home page
    "/sign-in",            // Sign-in page  
    "/sign-up",            // Sign-up page
    "/api/webhooks/clerk"  // Your existing webhook
  ],
  
  // Optional: Add debug mode to see what's happening
  debug: true
});

export const config = {
  matcher: [
    // Exclude files with a "." followed by an extension, which are typically static files.
    // Exclude files in the _next directory, which are Next.js internals.
    "/((?!.+\\.[\\w]+$|_next).*)",
    // Re-include any files in the api or trpc folders that might have an extension
    "/(api|trpc)(.*)"
  ]
};