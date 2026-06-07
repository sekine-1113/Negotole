import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminAuditLogs, campaigns } from "@/lib/db/schema";
import { log } from "@/lib/logger";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const campaignId = Number(id);
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), isNull(campaigns.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: Partial<{ name: string; description: string | null; startsAt: Date; endsAt: Date; bonusPoints: number; pointsType: string; updatedAt: Date }> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.length === 0 || body.name.length > 255) {
      return NextResponse.json({ error: "name は 1〜255 文字で入力してください。" }, { status: 400 });
    }
    updates.name = body.name;
  }
  if (body.description !== undefined) {
    updates.description = body.description;
  }

  const startsAt = body.startsAt !== undefined ? new Date(body.startsAt) : existing.startsAt;
  const endsAt = body.endsAt !== undefined ? new Date(body.endsAt) : existing.endsAt;

  if (body.startsAt !== undefined) updates.startsAt = startsAt;
  if (body.endsAt !== undefined) updates.endsAt = endsAt;

  if (endsAt <= startsAt) {
    return NextResponse.json({ error: "endsAt は startsAt より後の日時を指定してください。" }, { status: 400 });
  }

  if (body.bonusPoints !== undefined) {
    if (typeof body.bonusPoints !== "number" || body.bonusPoints < 1 || !Number.isInteger(body.bonusPoints)) {
      return NextResponse.json({ error: "bonusPoints は 1 以上の整数で入力してください。" }, { status: 400 });
    }
    updates.bonusPoints = body.bonusPoints;
  }
  if (body.pointsType !== undefined) {
    if (!["permanent", "limited"].includes(body.pointsType)) {
      return NextResponse.json({ error: "pointsType は permanent または limited を指定してください。" }, { status: 400 });
    }
    updates.pointsType = body.pointsType;
  }

  const now = new Date();
  const conflicting = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(
      and(
        ne(campaigns.id, campaignId),
        sql`${campaigns.startsAt} <= ${now}`,
        sql`${campaigns.endsAt} >= ${now}`,
        isNull(campaigns.deletedAt)
      )
    )
    .limit(1);

  if (conflicting.length > 0) {
    return NextResponse.json(
      { error: "既にアクティブなキャンペーンが存在します。終了してから更新してください。" },
      { status: 409 }
    );
  }

  updates.updatedAt = now;

  const [updated] = await db
    .update(campaigns)
    .set(updates)
    .where(eq(campaigns.id, campaignId))
    .returning();

  const adminId = Number(session.user.id);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action: "campaign.update",
      targetType: "campaign",
      targetId: campaignId,
      payload: { campaignId, name: updated.name },
      ipAddress: ip,
    });
  } catch {
    // サイレント失敗
  }
  log("info", "admin.campaign.updated", { adminId, campaignId });

  return NextResponse.json({
    campaign: { ...updated, isActive: updated.startsAt <= now && updated.endsAt >= now },
  });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const campaignId = Number(id);
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [existing] = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), isNull(campaigns.deletedAt)))
    .limit(1);

  if (!existing) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await db
    .update(campaigns)
    .set({ deletedAt: new Date() })
    .where(eq(campaigns.id, campaignId));

  const adminId = Number(session.user.id);
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;

  try {
    await db.insert(adminAuditLogs).values({
      adminId,
      action: "campaign.delete",
      targetType: "campaign",
      targetId: campaignId,
      payload: { campaignId },
      ipAddress: ip,
    });
  } catch {
    // サイレント失敗
  }
  log("info", "admin.campaign.deleted", { adminId, campaignId });

  return NextResponse.json({ success: true });
}
