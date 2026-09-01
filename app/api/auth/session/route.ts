import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    memberId: session.memberId,
    email: session.email,
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}