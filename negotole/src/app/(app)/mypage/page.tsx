import { auth } from "@/lib/auth";
import { getPointBalance } from "@/lib/points";
import { redirect } from "next/navigation";

export default async function MyPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/");
  }

  let balance = { daily: 0, permanent: 0, total: 0 };
  try {
    balance = await getPointBalance(Number(session.user.id));
  } catch {
    // ポイント取得失敗時はデフォルト値を使用
  }

  return (
    <main className="px-4 py-6 max-w-xl mx-auto relative z-10">
      <section className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-6 backdrop-blur-md shadow-xl relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/40 to-transparent" />

        <div className="mb-6">
          <h2 className="text-lg font-bold text-indigo-100">あなたの夢うつつ</h2>
          <p className="text-xs text-slate-400">ポイントを消費してタイムラインに寝言を放てます</p>
        </div>

        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">保有ポイントの内訳</h3>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-slate-950/70 border border-pink-500/20 rounded-xl p-3.5 relative">
            <span className="absolute top-2.5 right-2.5 bg-pink-500/10 text-pink-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              本日中有効
            </span>
            <span className="text-[10px] text-slate-400 block mb-1">期間限定ポイント</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-pink-400">{balance.daily}</span>
              <span className="text-xs text-slate-400">pt</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">※投稿時に最優先で消費されます</p>
          </div>

          <div className="bg-slate-950/70 border border-indigo-500/20 rounded-xl p-3.5 relative">
            <span className="absolute top-2.5 right-2.5 bg-indigo-500/10 text-indigo-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold">
              期限なし
            </span>
            <span className="text-[10px] text-slate-400 block mb-1">恒久ポイント</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-black text-indigo-300">{balance.permanent}</span>
              <span className="text-xs text-slate-400">pt</span>
            </div>
            <p className="text-[9px] text-slate-500 mt-2">キャンペーン等で付与されます</p>
          </div>
        </div>

        <div className="p-3 bg-slate-950/40 rounded-xl border border-indigo-950/40 text-xs text-slate-400 leading-relaxed">
          <p className="font-bold text-indigo-300 mb-1">ポイントは自動的に配布されます</p>
          <p className="text-[11px] text-slate-500">
            ユーザー自身による購入や手動チャージはありません。期間限定ポイントは毎日のキャンペーンなどで入手可能です。
          </p>
        </div>
      </section>
    </main>
  );
}
