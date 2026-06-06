import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { grantCampaignPoints, grantDailyPoints, getActiveCampaign, hasCampaignApplied, hasDailyPointToday } from "./points";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google,
    Credentials({
      credentials: {},
      async authorize() {
        const [guest] = await db
          .insert(users)
          .values({ name: "ゲスト" })
          .returning({ id: users.id, role: users.role });
        return { id: String(guest.id), name: "ゲスト", role: guest.role };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user, profile }) {
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
      } else if (user?.id) {
        token.userId = Number(user.id);
        token.role = (user as { role?: string }).role ?? "user";
        token.isNewUser = true;
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

      if (token.userId) {
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
            }
          }
        } catch (e) {
          console.error("[auth] campaign point grant failed:", e);
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
      return session;
    },
  },
});
