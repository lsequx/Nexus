import { NextResponse } from "next/server";
import {
  createResetCode,
  hashResetCode,
  normalizeEmail,
  readUsers,
  writeUsers,
} from "@/lib/auth-server";

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string };
  const email = normalizeEmail(body.email ?? "");
  const users = readUsers();
  const index = users.findIndex((user) => user.email === email);

  if (index < 0) {
    return NextResponse.json({ ok: true, message: "If the account exists, a reset code was created." });
  }

  const code = createResetCode();
  users[index] = {
    ...users[index],
    resetCodeHash: hashResetCode(code),
    resetCodeExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
  };
  writeUsers(users);

  return NextResponse.json({
    ok: true,
    message: "Reset code created.",
    ...(process.env.NODE_ENV !== "production" ? { demoResetCode: code } : {}),
  });
}
