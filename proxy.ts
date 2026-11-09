import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Scoped to the dashboard: marketing and marketplace pages are public and
// should not pay for a session check on every request.
export const config = {
  matcher: ["/dashboard/:path*"],
};
