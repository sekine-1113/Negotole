import { auth } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import { PostForm } from "@/components/PostForm";

export default async function NewPostPage() {
  const session = await auth();
  let totalPoints = 0;
  if (session?.user?.id) {
    try {
      const balance = await getPointBalance(Number(session.user.id));
      totalPoints = balance.total;
    } catch {
      // ポイント取得失敗時は 0 を表示
    }
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">投稿する</h1>
      <PostForm totalPoints={totalPoints} />
    </main>
  );
}
