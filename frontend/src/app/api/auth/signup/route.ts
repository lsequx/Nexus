import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  normalizeEmail,
  readUsers,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
  toPublicUser,
  writeUsers,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    name?: string;
    email?: string;
    password?: string;
  };

  const name = body.name?.trim() ?? "";
  const email = normalizeEmail(body.email ?? "");
  const password = body.password ?? "";

  if (name.length < 2 || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      { error: "Use a valid name, email, and password with at least 8 characters." },
      { status: 400 },
    );
  }

  const users = readUsers();
  if (users.some((user) => user.email === email)) {
    return NextResponse.json({ error: "An account already exists for this email." }, { status: 409 });
  }

  const { salt, hash } = hashPassword(password);
  const user = {
    id: crypto.randomUUID(),
    name,
    email,
    role: users.length === 0 ? ("admin" as const) : ("operator" as const),
    passwordSalt: salt,
    passwordHash: hash,
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, user]);

  const response = NextResponse.json({ user: toPublicUser(user) }, { status: 201 });
  response.cookies.set(SESSION_COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
  return response;
}
