import { and, gt, isNull, lt, or, sql, sum } from "drizzle-orm";
import { db } from "./db";
import { userPoints } from "./db/schema";

export async function getPointBalance(userId: number): Promise<{ daily: number; permanent: number; total: number }> {
  const now = new Date();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const rows = await db
    .select({ total: sum(userPoints.getPoint) })
    .from(userPoints)
    .where(
      and(
        sql`${userPoints.userId} = ${userId}`,
        isNull(userPoints.deletedAt),
        or(isNull(userPoints.expiresAt), gt(userPoints.expiresAt, now))
      )
    );

  const dailyRows = await db
    .select({ total: sum(userPoints.getPoint) })
    .from(userPoints)
    .where(
      and(
        sql`${userPoints.userId} = ${userId}`,
        isNull(userPoints.deletedAt),
        gt(userPoints.expiresAt, now),
        lt(userPoints.expiresAt, todayEnd)
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

  const total = Number(rows[0]?.total ?? 0);
  const daily = Number(dailyRows[0]?.total ?? 0);
  const permanent = Number(permanentRows[0]?.total ?? 0);

  return { daily, permanent, total };
}

export async function hasDailyPointToday(userId: number): Promise<boolean> {
  const now = new Date();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

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
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  await db.insert(userPoints).values({
    userId,
    getPoint: 10,
    expiresAt: todayEnd,
  });
}

export async function consumeOnePoint(userId: number): Promise<void> {
  await db.insert(userPoints).values({
    userId,
    getPoint: -1,
    expiresAt: null,
  });
}
