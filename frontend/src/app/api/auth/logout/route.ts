import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE, revokeSessions } from "@/lib/auth-server";
import { requireSession } from "@/lib/session-server";
import { requireSameOrigin, requestError } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const user = await requireSession();
    if (user) revokeSessions(user.id);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(SESSION_COOKIE_NAME, "", { httpOnly: true, sameSite: "strict", secure: SESSION_COOKIE_SECURE, path: "/", maxAge: 0 });
    return response;
  } catch (error) { return requestError(error); }
}
