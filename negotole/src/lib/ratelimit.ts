import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

function createLimiters() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return {
    postWriteLimiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60 s"),
      prefix: "ratelimit:post_write",
    }),
    authLimiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60 s"),
      prefix: "ratelimit:auth",
    }),
    adminLimiter: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "60 s"),
      prefix: "ratelimit:admin",
    }),
  };
}

const limiters = createLimiters();
export const postWriteLimiter = limiters?.postWriteLimiter ?? null;
export const authLimiter = limiters?.authLimiter ?? null;
export const adminLimiter = limiters?.adminLimiter ?? null;
