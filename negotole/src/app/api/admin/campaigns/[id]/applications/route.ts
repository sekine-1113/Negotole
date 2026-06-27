import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { campaignApplications, campaigns, users } from "@/lib/db/schema";
import { and, asc, count, eq, gt, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const campaignId = Number(id);
  if (!Number.isSafeInteger(campaignId) || campaignId <= 0) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const [campaign] = await db
    .select({ id: campaigns.id, name: campaigns.name })
    .from(campaigns)
    .where(and(eq(campaigns.id, campaignId), isNull(campaigns.deletedAt)))
    .limit(1);

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const rawLimit = Number(searchParams.get("limit") ?? 50);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 200) : 50;
  const cursor = searchParams.get("cursor");

  let cursorId: number | null = null;
  if (cursor) {
    const decoded = Number(Buffer.from(cursor, "base64").toString());
    if (!Number.isSafeInteger(decoded) || decoded <= 0) {
      return NextResponse.json({ error: "Invalid cursor" }, { status: 400 });
    }
    cursorId = decoded;
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(campaignApplications)
    .where(eq(campaignApplications.campaignId, campaignId));

  const rows = await db
    .select({
      applicationId: campaignApplications.id,
      userId: campaignApplications.userId,
      userName: users.name,
      appliedAt: campaignApplications.createdAt,
    })
    .from(campaignApplications)
    .leftJoin(users, eq(campaignApplications.userId, users.id))
    .where(
      and(
        eq(campaignApplications.campaignId, campaignId),
        cursorId ? gt(campaignApplications.id, cursorId) : undefined
      )
    )
    .orderBy(asc(campaignApplications.id))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;
  const nextCursor = hasMore
    ? Buffer.from(String(items[items.length - 1].applicationId)).toString("base64")
    : null;

  const serialized = items.map((r) => ({
    applicationId: r.applicationId,
    userId: r.userId,
    userName: r.userName ?? "不明",
    appliedAt: r.appliedAt.toISOString(),
  }));

  return NextResponse.json({
    campaign,
    total,
    applications: serialized,
    nextCursor,
  });
}
