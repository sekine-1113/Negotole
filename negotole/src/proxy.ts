import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isFrozen = req.auth?.user?.isFrozen;
  const { pathname } = req.nextUrl;

  if (
    isFrozen &&
    !pathname.startsWith("/account-suspended") &&
    !pathname.startsWith("/api/auth")
  ) {
    return NextResponse.redirect(new URL("/account-suspended", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js).*)"],
};
