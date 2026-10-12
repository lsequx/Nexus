import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_SECURE } from "@/lib/auth-server";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "strict",
    secure: SESSION_COOKIE_SECURE,
    path: "/",
    maxAge: 0,
  });
  return response;
}
