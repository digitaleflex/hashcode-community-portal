import { NextResponse } from "next/server";
import { getSession, clearSessionCookie, revokeSession } from "@/lib/auth";

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
  // Audit 3.5 : révoque le jti courant (blacklist) avant de supprimer le
  // cookie, sinon un token volé resterait valide 7 jours après logout.
  const session = await getSession();
  if (session?.jti) {
    try {
      await revokeSession(session.memberId, session.jti);
    } catch (error) {
      console.error("revokeSession error:", error);
    }
  }
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}