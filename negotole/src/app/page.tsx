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
    <main className="px-4 py-8 md:max-w-4xl md:mx-auto">
      <Timeline initialPosts={data.posts} initialNextCursor={data.nextCursor} />
    </main>
  );
}
