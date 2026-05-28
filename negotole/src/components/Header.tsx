import { auth, signIn, signOut } from "@/lib/auth";
import { getCachedPointBalance, hasDailyPointToday, grantDailyPoints } from "@/lib/points";
import Link from "next/link";
import { PointBadge } from "./PointBadge";

export async function Header() {
  const session = await auth();

  if (session?.user?.id) {
    try {
      const alreadyGranted = await hasDailyPointToday(Number(session.user.id));
      if (!alreadyGranted) {
        await grantDailyPoints(Number(session.user.id));
      }
    } catch {
      // サイレント失敗（FR-005）
    }
  }

  let totalPoints = 0;
  if (session?.user?.id) {
    try {
      const balance = await getCachedPointBalance(Number(session.user.id));
      totalPoints = balance.total;
    } catch {
      // ポイント取得失敗時は 0 を表示
    }
  }

  return (
    <header className="border-b border-gray-200 px-3 py-3 sm:px-4 flex items-center justify-between">
      <Link href="/" className="font-bold text-lg">
        Negotole
      </Link>
      <div className="flex items-center gap-2 sm:gap-3">
        {session?.user ? (
          <>
            <PointBadge total={totalPoints} />
            <Link
              href="/post/new"
              className="text-xs bg-black text-white rounded-full px-3 py-1 min-h-[44px] inline-flex items-center hover:bg-gray-800 sm:text-sm sm:px-4 sm:py-1.5"
            >
              投稿する
            </Link>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="text-xs text-gray-500 hover:text-gray-700 min-h-[44px] sm:text-sm">
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
            <button type="submit" className="text-xs bg-black text-white rounded-full px-3 py-1 min-h-[44px] inline-flex items-center hover:bg-gray-800 sm:text-sm sm:px-4 sm:py-1.5">
              Google でログイン
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
