import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import { adminLimiter } from "@/lib/ratelimit";
import { and, gt, isNotNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = Number(session.user.id);
  if (adminLimiter) {
    try {
      const { success } = await adminLimiter.limit(`user:${userId}`);
      if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    } catch (e) {
      log("warn", "ratelimit.check_failed", { userId, error: String(e) });
    }
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 20);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20;
  const cursor = searchParams.get("cursor");
  const frozen = searchParams.get("frozen") === "true";

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
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        cursorId ? gt(users.id, cursorId) : undefined,
        frozen ? isNotNull(users.bannedAt) : undefined,
      ),
    )
    .orderBy(users.id)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].id)).toString("base64")
    : null;

  return NextResponse.json({ users: items, nextCursor });
}
