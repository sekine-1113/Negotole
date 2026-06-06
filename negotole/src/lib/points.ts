import { and, eq, gt, isNull, sql, sum } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import { campaignApplications, campaigns, userPoints } from "./db/schema";
import type { Campaign } from "./db/schema";

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function getJSTDayBounds(): { todayStart: Date; todayEnd: Date } {
  const nowUTC = Date.now();
  const nowJST = new Date(nowUTC + JST_OFFSET_MS);

  const startJST = new Date(nowJST);
  startJST.setUTCHours(0, 0, 0, 0);

  const endJST = new Date(nowJST);
  endJST.setUTCHours(23, 59, 59, 999);

  return {
    todayStart: new Date(startJST.getTime() - JST_OFFSET_MS),
    todayEnd: new Date(endJST.getTime() - JST_OFFSET_MS),
  };
}

export async function getPointBalance(userId: number): Promise<{ daily: number; permanent: number; total: number }> {
  const now = new Date();

  const dailyRows = await db
    .select({ total: sum(userPoints.getPoint) })
    .from(userPoints)
    .where(
      and(
        sql`${userPoints.userId} = ${userId}`,
        isNull(userPoints.deletedAt),
        gt(userPoints.expiresAt, now)
      )
    );

  const permanentRows = await db
    .select({ total: sum(userPoints.getPoint) })
    .from(userPoints)
    .where(
      and(
        sql`${userPoints.userId} = ${userId}`,
        isNull(userPoints.deletedAt),
        isNull(userPoints.expiresAt)
      )
    );

  const daily = Number(dailyRows[0]?.total ?? 0);
  const permanent = Number(permanentRows[0]?.total ?? 0);

  return { daily, permanent, total: daily + permanent };
}

export async function hasDailyPointToday(userId: number): Promise<boolean> {
  const now = new Date();
  const { todayStart } = getJSTDayBounds();

  const rows = await db
    .select({ id: userPoints.id })
    .from(userPoints)
    .where(
      and(
        sql`${userPoints.userId} = ${userId}`,
        gt(userPoints.getPoint, 0),
        gt(userPoints.expiresAt, now),
        gt(userPoints.createdAt, todayStart),
        isNull(userPoints.deletedAt)
      )
    )
    .limit(1);

  return rows.length > 0;
}

export async function grantDailyPoints(userId: number): Promise<void> {
  const { todayEnd } = getJSTDayBounds();

  await db.insert(userPoints).values({
    userId,
    getPoint: 10,
    expiresAt: todayEnd,
  });
}

export function getCachedPointBalance(userId: number): Promise<{ daily: number; permanent: number; total: number }> {
  return unstable_cache(
    () => getPointBalance(userId),
    [`point-balance-${userId}`],
    { tags: [`user-points-${userId}`], revalidate: false }
  )();
}

export async function consumeOnePoint(userId: number): Promise<void> {
  const { todayEnd } = getJSTDayBounds();
  await db.insert(userPoints).values({
    userId,
    getPoint: -1,
    expiresAt: todayEnd,
  });
}

export async function getActiveCampaign(): Promise<Campaign | null> {
  const now = new Date();
  const rows = await db
    .select()
    .from(campaigns)
    .where(
      and(
        sql`${campaigns.startsAt} <= ${now}`,
        sql`${campaigns.endsAt} >= ${now}`,
        isNull(campaigns.deletedAt)
      )
    )
    .orderBy(campaigns.startsAt)
    .limit(1);

  return rows[0] ?? null;
}

export async function hasCampaignApplied(userId: number, campaignId: number): Promise<boolean> {
  const rows = await db
    .select({ id: campaignApplications.id })
    .from(campaignApplications)
    .where(and(eq(campaignApplications.userId, userId), eq(campaignApplications.campaignId, campaignId)))
    .limit(1);
  return rows.length > 0;
}

export async function grantCampaignPoints(
  userId: number,
  campaignId: number,
  bonusPoints: number,
  pointsType: string,
  endsAt: Date,
): Promise<void> {
  const expiresAt = pointsType === "limited" ? endsAt : null;
  await db.transaction(async (tx) => {
    await tx.insert(campaignApplications).values({ campaignId, userId });
    await tx.insert(userPoints).values({ userId, getPoint: bonusPoints, expiresAt });
  });
}
