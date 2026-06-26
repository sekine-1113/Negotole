import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { userPoints } from "@/lib/db/schema";
import { and, desc, eq, isNull, lt } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = Number(session.user.id);
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

  const rows = await db
    .select({
      id: userPoints.id,
      getPoint: userPoints.getPoint,
      expiresAt: userPoints.expiresAt,
      createdAt: userPoints.createdAt,
    })
    .from(userPoints)
    .where(
      and(
        eq(userPoints.userId, userId),
        isNull(userPoints.deletedAt),
        cursorId ? lt(userPoints.id, cursorId) : undefined
      )
    )
    .orderBy(desc(userPoints.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  const serialized = items.map((r) => ({
    id: r.id,
    getPoint: r.getPoint,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({ points: serialized, nextCursor });
}
