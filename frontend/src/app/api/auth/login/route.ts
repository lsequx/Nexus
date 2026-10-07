import { NextResponse } from "next/server";
import {
  createSessionToken,
  normalizeEmail,
  readUsers,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  toPublicUser,
  verifyPassword,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string };
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";
  const user = readUsers().find((candidate) => candidate.email === email);

  if (!user) {
    return NextResponse.json(
      { error: "Account not found.", code: "ACCOUNT_NOT_FOUND" },
      { status: 404 },
    );
  }

  if (!verifyPassword(password, user)) {
    return NextResponse.json(
      { error: "Incorrect password.", code: "INVALID_PASSWORD" },
      { status: 401 },
    );
  }

  const response = NextResponse.json({ user: toPublicUser(user) });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
