import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { guestUsers, userPoints } from "@/lib/db/schema";
import { and, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.isGuest) {
    return NextResponse.json({ error: "正式アカウントでログインしてください" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.code || typeof body.code !== "string") {
    return NextResponse.json({ error: "コードを入力してください" }, { status: 400 });
  }

  const code = body.code.trim().toUpperCase();
  if (!/^[A-Z0-9]{8}$/.test(code)) {
    return NextResponse.json({ error: "無効なコード形式です" }, { status: 400 });
  }

  const now = new Date();
  const [guestUser] = await db
    .select({ id: guestUsers.id, appUserId: guestUsers.appUserId, transferredAt: guestUsers.transferredAt })
    .from(guestUsers)
    .where(
      and(
        eq(guestUsers.transferCode, code),
        gt(guestUsers.transferCodeExpiresAt, now),
        isNull(guestUsers.transferredAt)
      )
    )
    .limit(1);

  if (!guestUser) {
    return NextResponse.json({ error: "コードが無効または期限切れです" }, { status: 404 });
  }

  const claimingUserId = Number(session.user.id);
  if (guestUser.appUserId === claimingUserId) {
    return NextResponse.json({ error: "自分自身のコードは使用できません" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    // ゲストのポイントを全て引継ぎ先ユーザーに移管
    await tx
      .update(userPoints)
      .set({ userId: claimingUserId })
      .where(eq(userPoints.userId, guestUser.appUserId));

    // 引継ぎ完了を記録
    await tx
      .update(guestUsers)
      .set({
        transferredAt: sql`NOW()`,
        transferredToUserId: claimingUserId,
        updatedAt: sql`NOW()`,
      })
      .where(eq(guestUsers.id, guestUser.id));
  });

  revalidateTag(`user-points-${claimingUserId}`, "max");

  return NextResponse.json({ success: true }, { status: 200 });
}
