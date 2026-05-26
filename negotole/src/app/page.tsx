import { Timeline } from "@/components/Timeline";
import { fetchPosts, type FetchPostsResult } from "@/lib/posts";

export default async function HomePage() {
  let data: FetchPostsResult = { posts: [], nextCursor: null };
  try {
    data = await fetchPosts();
  } catch (e) {
    console.error("[HomePage] Failed to fetch posts:", e);
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <Timeline initialPosts={data.posts} initialNextCursor={data.nextCursor} />
    </main>
  );
}
