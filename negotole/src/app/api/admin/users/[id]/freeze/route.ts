import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminAuditLogs, users } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import { adminLimiter } from "@/lib/ratelimit";
import { eq } from "drizzle-orm";
import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const adminId = Number(session.user.id);
  if (adminLimiter) {
    try {
      const { success } = await adminLimiter.limit(`user:${adminId}`);
      if (!success) return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
    } catch (e) {
      log("warn", "ratelimit.check_failed", { userId: adminId, error: String(e) });
    }
  }

  const { id } = await params;
  const userId = Number(id);
  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [target] = await db
    .select({ id: users.id, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (target.bannedAt) {
    return NextResponse.json({ error: "Already frozen" }, { status: 409 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  const now = new Date();
  await db.update(users).set({ bannedAt: now }).where(eq(users.id, userId));

  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action: "user.freeze",
      targetType: "user",
      targetId: userId,
      payload: { userId, bannedAt: now.toISOString() },
      ipAddress: ip,
    });
  } catch (e) {
    await db.update(users).set({ bannedAt: null }).where(eq(users.id, userId));
    log("error", "user.freeze_audit_failed", { userId, adminId, error: String(e) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }

  revalidateTag(`user-frozen-${userId}`, "max");
  log("info", "user.frozen_by_admin", { userId, adminId });
  return NextResponse.json({ success: true });
}
