import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import { grantDailyPoints, hasDailyPointToday } from "./points";

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
        } else {
          const [created] = await db
            .insert(users)
            .values({ name, email })
            .returning({ id: users.id });
          userId = created.id;
        }

        token.userId = userId;

        const alreadyGranted = await hasDailyPointToday(userId);
        if (!alreadyGranted) {
          await grantDailyPoints(userId);
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = String(token.userId);
      }
      return session;
    },
  },
});
