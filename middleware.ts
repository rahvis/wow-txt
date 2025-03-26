import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Only protect transcript routes
  if (request.nextUrl.pathname.startsWith("/dashboard/transcript")) {
    const sessionCookie = request.cookies.get("user-session")?.value;

    // If no session, allow the request to proceed (the page will show login form)
    if (!sessionCookie) {
      return NextResponse.next();
    }

    try {
      // Validate session data
      const sessionData = JSON.parse(sessionCookie);
      if (!sessionData.userId || !sessionData.transcriptId) {
        // Invalid session data, clear the cookie
        const response = NextResponse.next();
        response.cookies.delete("user-session");
        return response;
      }

      // Extract the requested transcriptId from the URL
      const urlParts = request.nextUrl.pathname.split("/");
      const requestedTranscriptId = urlParts[urlParts.length - 1];

      // If the requested transcriptId doesn't match the session's transcriptId
      if (requestedTranscriptId !== sessionData.transcriptId) {
        // Clear the session and redirect to the login page
        const response = NextResponse.redirect(new URL("/dashboard/transcript", request.url));
        response.cookies.delete("user-session");
        return response;
      }
    } catch (error) {
      // Invalid JSON in session cookie, clear it
      const response = NextResponse.next();
      response.cookies.delete("user-session");
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/dashboard/transcript/:path*",
}; 