import { auth, signIn, signOut } from "@/lib/auth";
import { getCachedPointBalance, hasDailyPointToday, grantDailyPoints } from "@/lib/points";
import { Moon } from "lucide-react";
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
    <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-950/60 border-b border-indigo-950/50 px-4 py-3">
      <div className="max-w-xl mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 animate-[float_4s_ease-in-out_infinite]">
            <Moon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-wider bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
              negotole
            </h1>
            <p className="text-[10px] text-indigo-300/80 tracking-widest font-bold -mt-1">
              寝言る - 夢うつつのタイムライン
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {session?.user ? (
            <>
              <PointBadge total={totalPoints} />
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="text-xs text-indigo-300/80 hover:text-indigo-100 min-h-[44px] sm:text-sm transition"
                >
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
              <button
                type="submit"
                className="text-xs bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full px-4 py-2 min-h-[44px] inline-flex items-center shadow-lg shadow-indigo-500/20 transition sm:text-sm"
              >
                Google でログイン
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
