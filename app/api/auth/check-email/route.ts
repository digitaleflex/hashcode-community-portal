import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { members } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email requis" }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const member = await db
      .select()
      .from(members)
      .where(eq(members.email, normalizedEmail))
      .limit(1);

    if (member.length > 0) {
      return NextResponse.json({
        exists: true,
        firstName: member[0].firstName,
        lastName: member[0].lastName,
      });
    } else {
      return NextResponse.json({
        exists: false,
      });
    }
  } catch (error) {
    console.error("check-email error:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}