import { auth } from "@/lib/auth";
import { CampaignBanner } from "@/components/CampaignBanner";
import { Timeline } from "@/components/Timeline";
import { getActiveCampaign } from "@/lib/points";
import { fetchPosts, type FetchPostsResult } from "@/lib/posts";

export default async function HomePage() {
  const [session, data, campaign] = await Promise.all([
    auth(),
    fetchPosts().catch((e) => {
      console.error("[HomePage] Failed to fetch posts:", e);
      return { posts: [], nextCursor: null } as FetchPostsResult;
    }),
    getActiveCampaign().catch(() => null),
  ]);

  const isLoggedIn = !!session?.user;

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      {campaign && <CampaignBanner campaign={campaign} isLoggedIn={isLoggedIn} />}
      <Timeline
        initialPosts={data.posts}
        initialNextCursor={data.nextCursor}
        isLoggedIn={isLoggedIn}
      />
    </main>
  );
}
