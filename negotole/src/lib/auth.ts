import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { revalidateTag, unstable_cache } from "next/cache";
import { db } from "./db";
import { loginLogs, users } from "./db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { log } from "./logger";
import { grantCampaignPoints, grantDailyPoints, getActiveCampaign, hasCampaignApplied, hasDailyPointToday } from "./points";

async function checkUserFrozen(userId: number): Promise<boolean> {
  const check = unstable_cache(
    async () => {
      const [user] = await db
        .select({ bannedAt: users.bannedAt })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      return !!user?.bannedAt;
    },
    [`user-frozen-${userId}`],
    { tags: [`user-frozen-${userId}`] },
  );
  return check();
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user, profile }) {
      const email = profile?.email ?? null;
      if (email) {
        const [existing] = await db
          .select({ bannedAt: users.bannedAt })
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (existing?.bannedAt) return false;
      } else if (user?.id) {
        const [existing] = await db
          .select({ bannedAt: users.bannedAt })
          .from(users)
          .where(eq(users.id, Number(user.id)))
          .limit(1);
        if (existing?.bannedAt) return false;
      }
      return true;
    },
    async jwt({ token, user, profile }) {
      let isInitialSignIn = false;

      if (profile?.email) {
        const email = profile.email;
        const name = (profile.name as string | undefined) ?? email;

        const existing = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        let userId: number;
        if (existing.length > 0) {
          userId = existing[0].id;
          token.isNewUser = false;
          token.role = existing[0].role;
        } else {
          const [created] = await db
            .insert(users)
            .values({ name, email })
            .returning({ id: users.id, role: users.role });
          userId = created.id;
          token.isNewUser = true;
          token.role = created.role;
        }

        token.userId = userId;
        isInitialSignIn = true;
      }

      if (isInitialSignIn && token.userId) {
        const headersList = await headers();
        const ip =
          headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          headersList.get("x-real-ip") ??
          null;
        const userAgent = headersList.get("user-agent") ?? null;
        try {
          await db.insert(loginLogs).values({
            userId: Number(token.userId),
            ipAddress: ip,
            userAgent,
          });
        } catch {
          // サイレント失敗
        }
      }

      if (token.userId) {
        // 凍結チェック（毎リクエスト、unstable_cache でキャッシュ）
        try {
          token.isFrozen = await checkUserFrozen(Number(token.userId));
        } catch {
          token.isFrozen = false;
        }

        let pointsChanged = false;
        try {
          const alreadyGranted = await hasDailyPointToday(Number(token.userId));
          if (!alreadyGranted) {
            await grantDailyPoints(Number(token.userId));
            pointsChanged = true;
          }
        } catch (e) {
          log("error", "auth.daily_points_failed", { userId: token.userId, error: String(e) });
        }

        if (!isInitialSignIn) {
          if (pointsChanged) revalidateTag(`user-points-${token.userId}`, "max");
          return token;
        }

        try {
          const campaign = await getActiveCampaign();
          if (campaign) {
            const alreadyApplied = await hasCampaignApplied(Number(token.userId), campaign.id);
            if (!alreadyApplied) {
              await grantCampaignPoints(
                Number(token.userId),
                campaign.id,
                campaign.bonusPoints,
                campaign.pointsType,
                campaign.endsAt,
              );
              pointsChanged = true;
            }
          }
        } catch (e) {
          log("error", "auth.campaign_points_failed", { userId: token.userId, error: String(e) });
        }

        if (pointsChanged) {
          revalidateTag(`user-points-${token.userId}`, "max");
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
      }
      if (token.role) {
        session.user.role = token.role;
      }
      session.user.isFrozen = token.isFrozen ?? false;
      return session;
    },
  },
});
