import { auth, signIn, signOut } from "@/lib/auth";
import Link from "next/link";
import { PointBadge } from "./PointBadge";

async function getPoints(userId: string): Promise<number> {
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

export async function Header() {
  const session = await auth();

  return (
    <header className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">
        Negotole
      </Link>
      <div className="flex items-center gap-3">
        {session?.user ? (
          <>
            <PointBadge total={await getPoints(session.user.id!)} />
            <Link
              href="/post/new"
              className="text-sm bg-black text-white rounded-full px-4 py-1.5 hover:bg-gray-800"
            >
              投稿する
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-sm text-gray-500 hover:text-gray-700">
                ログアウト
              </button>
            </form>
          </>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button type="submit" className="text-sm bg-black text-white rounded-full px-4 py-1.5 hover:bg-gray-800">
              Google でログイン
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
