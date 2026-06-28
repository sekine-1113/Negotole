import { auth } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import { getRandomExpiredPost } from "@/lib/posts";
import { PostForm } from "@/components/PostForm";

export default async function NewPostPage() {
  const session = await auth();
  let totalPoints = 0;
  let pastPost: { content: string } | null = null;
  if (session?.user?.id) {
    const userId = Number(session.user.id);
    try {
      const balance = await getPointBalance(userId);
      totalPoints = balance.total;
    } catch {
      // ポイント取得失敗時は 0 を表示
    }
    try {
      pastPost = await getRandomExpiredPost(userId);
    } catch {
      // 過去投稿取得失敗時は非表示
    }
  }

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <h1 className="text-xl font-bold mb-6 text-indigo-200">投稿する</h1>
      <PostForm totalPoints={totalPoints} pastPost={pastPost} />
    </main>
  );
}
