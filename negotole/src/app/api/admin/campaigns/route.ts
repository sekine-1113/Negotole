import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaigns } from "@/lib/db/schema";
import { and, desc, isNull, lt, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
  const cursor = searchParams.get("cursor");

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (!Number.isSafeInteger(decoded) || decoded <= 0) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorId = decoded;
  }

  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(and(isNull(campaigns.deletedAt), cursorId ? lt(campaigns.id, cursorId) : undefined))
    .orderBy(desc(campaigns.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const result = items.map((c) => ({
    ...c,
    isActive: c.startsAt <= now && c.endsAt >= now,
  }));

  return NextResponse.json({ campaigns: result, nextCursor });
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
