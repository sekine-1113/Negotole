import { and, gt, isNull, sql, sum } from "drizzle-orm";
import { db } from "./db";
import { campaigns, userPoints } from "./db/schema";
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

export async function grantCampaignPoints(userId: number, bonusPoints: number): Promise<void> {
  await db.insert(userPoints).values({
    userId,
    getPoint: bonusPoints,
    expiresAt: null,
  });
}
