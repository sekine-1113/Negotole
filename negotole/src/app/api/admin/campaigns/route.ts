import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { and, desc, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(isNull(campaigns.deletedAt))
    .orderBy(desc(campaigns.createdAt));

  const result = rows.map((c) => ({
    ...c,
    isActive: c.startsAt <= now && c.endsAt >= now,
  }));

  return NextResponse.json({ campaigns: result });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, startsAt, endsAt, bonusPoints } = body;

  if (!name || typeof name !== "string" || name.length === 0 || name.length > 255) {
    return NextResponse.json({ error: "name は 1〜255 文字で入力してください。" }, { status: 400 });
  }
  if (!startsAt || !endsAt) {
    return NextResponse.json({ error: "startsAt と endsAt は必須です。" }, { status: 400 });
  }
  const startsAtDate = new Date(startsAt);
  const endsAtDate = new Date(endsAt);
  if (isNaN(startsAtDate.getTime()) || isNaN(endsAtDate.getTime())) {
    return NextResponse.json({ error: "startsAt と endsAt は ISO 8601 形式で入力してください。" }, { status: 400 });
  }
  if (endsAtDate <= startsAtDate) {
    return NextResponse.json({ error: "endsAt は startsAt より後の日時を指定してください。" }, { status: 400 });
  }
  if (!bonusPoints || typeof bonusPoints !== "number" || bonusPoints < 1 || !Number.isInteger(bonusPoints)) {
    return NextResponse.json({ error: "bonusPoints は 1 以上の整数で入力してください。" }, { status: 400 });
  }

  const now = new Date();
  const existing = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        sql`${campaigns.startsAt} <= ${now}`,
        sql`${campaigns.endsAt} >= ${now}`,
        isNull(campaigns.deletedAt)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "既にアクティブなキャンペーンが存在します。終了してから作成してください。" },
      { status: 409 }
    );
  }

  const [created] = await db
    .insert(campaigns)
    .values({ name, description: description ?? null, startsAt: startsAtDate, endsAt: endsAtDate, bonusPoints })
    .returning();

  return NextResponse.json(
    { campaign: { ...created, isActive: created.startsAt <= now && created.endsAt >= now } },
    { status: 201 }
  );
}
