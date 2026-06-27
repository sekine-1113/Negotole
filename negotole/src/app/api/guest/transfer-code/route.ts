import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { guestUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  const array = new Uint8Array(8);
  crypto.getRandomValues(array);
  for (const byte of array) {
    code += chars[byte % chars.length];
  }
  return code;
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id || !session.user.isGuest) {
    return NextResponse.json({ error: "ゲストユーザーのみ利用可能です" }, { status: 403 });
  }
  if (!session.user.guestToken) {
    return NextResponse.json({ error: "ゲストトークンが見つかりません" }, { status: 400 });
  }

  const [guestUser] = await db
    .select({ id: guestUsers.id, transferredAt: guestUsers.transferredAt })
    .from(guestUsers)
    .where(eq(guestUsers.guestId, session.user.guestToken))
    .limit(1);

  if (!guestUser) {
    return NextResponse.json({ error: "ゲストユーザーが見つかりません" }, { status: 404 });
  }
  if (guestUser.transferredAt) {
    return NextResponse.json({ error: "すでに引継ぎ済みです" }, { status: 409 });
  }

  const code = generateCode();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db
    .update(guestUsers)
    .set({ transferCode: code, transferCodeExpiresAt: expiresAt, updatedAt: new Date() })
    .where(eq(guestUsers.id, guestUser.id));

  return NextResponse.json({ code, expiresAt: expiresAt.toISOString() }, { status: 200 });
}
