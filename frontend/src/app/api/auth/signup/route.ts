import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSessionToken, hashPassword, normalizeEmail, readUsers, SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE, SESSION_MAX_AGE, toPublicUser, writeUsers } from "@/lib/auth-server";
import { readJsonBody, rateLimit, requestError, RequestError } from "@/lib/request-security";

export async function POST(request: Request) {
  if ((process.env.NEXUS_ALLOW_SIGNUP ?? (process.env.NODE_ENV === "production" ? "false" : "true")) !== "true") return NextResponse.json({ error: "Registration is disabled. Contact the administrator." }, { status: 403 });
  try {
    const body = await readJsonBody(request);
    if (typeof body.name !== "string" || typeof body.email !== "string" || typeof body.password !== "string") throw new RequestError("Invalid registration details.", 400);
    const name = body.name.trim(), email = normalizeEmail(body.email), password = body.password;
    if (name.length < 2 || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12 || password.length > 128) throw new RequestError("Use a valid name and email, and a password with 12–128 characters.", 400);
    rateLimit("signup:global", 20, 60 * 60_000);
    const users = readUsers();
    if (users.some((user) => user.email === email)) return NextResponse.json({ error: "Unable to register with these details." }, { status: 409 });
    const { salt, hash } = hashPassword(password);
    const user = { id: crypto.randomUUID(), name, email, role: "operator" as const, passwordSalt: salt, passwordHash: hash, createdAt: new Date().toISOString(), sessionVersion: 0 };
    writeUsers([...users, user]);
    const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), { httpOnly: true, sameSite: "strict", secure: SESSION_COOKIE_SECURE, path: "/", maxAge: SESSION_MAX_AGE });
    return response;
  } catch (error) { return requestError(error); }
}
