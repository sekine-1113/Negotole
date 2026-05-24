import { PostForm } from "@/components/PostForm";

async function getPoints(): Promise<number> {
  try {
    const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/users/me`, { cache: "no-store" });
    if (!res.ok) return 0;
    const data = await res.json();
    return data.points?.total ?? 0;
  } catch {
    return 0;
  }
}

export default async function NewPostPage() {
  const totalPoints = await getPoints();

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <h1 className="text-xl font-bold mb-6">投稿する</h1>
      <PostForm totalPoints={totalPoints} />
    </main>
  );
}
