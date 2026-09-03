import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const isAdmin = adminEmail ? session.email.toLowerCase() === adminEmail : false;

  return NextResponse.json({
    authenticated: true,
    memberId: session.memberId,
    email: session.email,
    isAdmin,
  });
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}