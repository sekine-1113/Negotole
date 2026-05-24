import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { grantCampaignPoints, grantDailyPoints, getActiveCampaign, hasDailyPointToday } from "./points";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, profile }) {
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
      }

      if (token.userId) {
        try {
          const alreadyGranted = await hasDailyPointToday(Number(token.userId));
          if (!alreadyGranted) {
            await grantDailyPoints(Number(token.userId));
          }
        } catch (e) {
          console.error("[auth] daily point grant failed:", e);
        }
      }

      if (token.isNewUser === true) {
        try {
          const campaign = await getActiveCampaign();
          if (campaign) {
            await grantCampaignPoints(Number(token.userId), campaign.bonusPoints);
          }
        } catch (e) {
          console.error("[auth] campaign point grant failed:", e);
        }
        token.isNewUser = false;
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
      return session;
    },
  },
});
