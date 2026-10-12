import { NextResponse } from "next/server";

// No verified email delivery exists. Never disclose a reset credential over HTTP.
export async function POST() {
  return NextResponse.json({ error: "Online password recovery is disabled. Contact the administrator." }, { status: 410 });
}
