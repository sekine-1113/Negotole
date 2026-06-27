import "next-auth/jwt";
import { DefaultSession } from "next-auth";

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    isNewUser?: boolean;
    role?: string;
    isFrozen?: boolean;
    isGuest?: boolean;
  }
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      isFrozen?: boolean;
      isGuest?: boolean;
    } & DefaultSession["user"];
  }
}
