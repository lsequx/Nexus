import { NextResponse } from "next/server";
import { createSessionToken, normalizeEmail, readUsers, SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE, SESSION_MAX_AGE, toPublicUser, verifyPassword } from "@/lib/auth-server";
import { readJsonBody, rateLimit, requestError, RequestError } from "@/lib/request-security";

export async function POST(request: Request) {
  try {
    const body = await readJsonBody(request);
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 254 || body.password.length > 128) throw new RequestError("Invalid login details.", 400);
    const email = normalizeEmail(body.email);
    rateLimit("login:global", 100, 60_000);
    rateLimit(`login:${email}`, 10, 15 * 60_000);
    const user = readUsers().find((candidate) => candidate.email === email);
    const valid = verifyPassword(body.password, user);
    if (!user || !valid) return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    const response = NextResponse.json({ user: toPublicUser(user) });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), { httpOnly: true, sameSite: "strict", secure: SESSION_COOKIE_SECURE, path: "/", maxAge: SESSION_MAX_AGE });
    return response;
  } catch (error) { return requestError(error); }
}
