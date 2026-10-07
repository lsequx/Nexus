import { NextResponse } from "next/server";
import {
  hashPassword,
  hashResetCode,
  normalizeEmail,
  readUsers,
  writeUsers,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    email?: string;
    code?: string;
    password?: string;
  };

  const email = normalizeEmail(body.email ?? "");
  const code = body.code?.trim() ?? "";
  const password = body.password ?? "";

  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const users = readUsers();
  const index = users.findIndex((user) => user.email === email);
  if (index < 0) {
    return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
  }

  const user = users[index];
  const valid =
    user.resetCodeHash === hashResetCode(code) &&
    user.resetCodeExpiresAt &&
    new Date(user.resetCodeExpiresAt).getTime() > Date.now();

  if (!valid) {
    return NextResponse.json({ error: "Invalid or expired reset code." }, { status: 400 });
  }

  const { salt, hash } = hashPassword(password);
  users[index] = {
    ...user,
    passwordSalt: salt,
    passwordHash: hash,
    resetCodeHash: undefined,
    resetCodeExpiresAt: undefined,
  };
  writeUsers(users);

  return NextResponse.json({ ok: true });
}
