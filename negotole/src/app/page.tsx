import { Timeline } from "@/components/Timeline";

export default async function HomePage() {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const res = await fetch(`${baseUrl}/api/posts`, { cache: "no-store" });
  const data = res.ok ? await res.json() : { posts: [], nextCursor: null };

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <Timeline initialPosts={data.posts} initialNextCursor={data.nextCursor} />
    </main>
  );
}
