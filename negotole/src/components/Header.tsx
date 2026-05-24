import { auth, signIn, signOut } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import Link from "next/link";
import { PointBadge } from "./PointBadge";

export async function Header() {
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
    <header className="border-b border-gray-200 px-4 py-3 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">
        Negotole
      </Link>
      <div className="flex items-center gap-3">
        {session?.user ? (
          <>
            <PointBadge total={totalPoints} />
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
