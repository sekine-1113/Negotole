import { auth } from "@/lib/auth";
import { Timeline } from "@/components/Timeline";
import { fetchPosts, type FetchPostsResult } from "@/lib/posts";

export default async function HomePage() {
  const [session, data] = await Promise.all([
    auth(),
    fetchPosts().catch((e) => {
      console.error("[HomePage] Failed to fetch posts:", e);
      return { posts: [], nextCursor: null } as FetchPostsResult;
    }),
  ]);

  const isLoggedIn = !!session?.user;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <Timeline
        initialPosts={data.posts}
        initialNextCursor={data.nextCursor}
        isLoggedIn={isLoggedIn}
      />
    </main>
  );
}
