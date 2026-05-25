import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { postWriteLimiter, authLimiter, adminLimiter } from "@/lib/ratelimit";

async function applyRateLimit(
  limiter: NonNullable<typeof postWriteLimiter>,
  identifier: string
): Promise<NextResponse | null> {
  const { success, reset } = await limiter.limit(identifier);
  if (!success) {
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests", retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }
  return null;
}

export const proxy = auth(async (req) => {
  const path = req.nextUrl.pathname;
  const method = req.method;

  // /api/auth/* — IP アドレス単位で制限
  if (path.startsWith("/api/auth/") && authLimiter) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const limited = await applyRateLimit(authLimiter, ip);
    if (limited) return limited;
  }

  // POST /api/posts — ユーザー ID 単位で制限
  if (path === "/api/posts" && method === "POST" && postWriteLimiter) {
    const userId = req.auth?.user?.id;
    if (userId) {
      const limited = await applyRateLimit(postWriteLimiter, userId);
      if (limited) return limited;
    }
  }

  // /api/admin/* — ユーザー ID 単位で制限
  if (path.startsWith("/api/admin/") && adminLimiter) {
    const userId = req.auth?.user?.id;
    if (userId) {
      const limited = await applyRateLimit(adminLimiter, userId);
      if (limited) return limited;
    }
  }

  // ページルートの認証チェック
  if (path.startsWith("/post/new") && !req.auth) {
    const signInUrl = new URL("/api/auth/signin", req.url);
    signInUrl.searchParams.set("callbackUrl", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (path.startsWith("/admin") && req.auth?.user?.role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: [
    "/post/new",
    "/admin/:path*",
    "/api/posts",
    "/api/auth/:path*",
    "/api/admin/:path*",
  ],
};
