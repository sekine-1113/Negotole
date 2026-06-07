import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "利用規約 | negotole",
};

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-900/40 border border-indigo-950/50 rounded-2xl p-6">
      <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-100 mb-5">
        <span className="w-1 h-4 bg-indigo-500 rounded-full shrink-0" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-3 text-sm text-slate-300 leading-7">
      <span className="text-indigo-400/70 shrink-0 mt-0.5">›</span>
      <span>{children}</span>
    </li>
  );
}

export default function TermsPage() {
  return (
    <main className="px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">利用規約</h1>
        <p className="text-indigo-300/50 text-xs">最終更新日: 2026年6月7日</p>
      </div>

      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl px-6 py-5 mb-6 text-sm text-slate-300 leading-7">
        negotole（以下「本サービス」）をご利用いただく前に、以下の利用規約をお読みください。
        本サービスを利用することで、これらの規約に同意したものとみなします。
      </div>

      <div className="space-y-4">
        <SectionCard title="禁止事項">
          <p className="text-sm text-slate-400 mb-4 leading-relaxed">
            本サービスの利用にあたり、以下の行為を禁止します。
          </p>
          <ul className="space-y-2.5">
            <BulletItem>他のユーザーへの誹謗中傷・ハラスメント行為</BulletItem>
            <BulletItem>個人情報の無断収集・公開</BulletItem>
            <BulletItem>著作権・商標権その他知的財産権を侵害するコンテンツの投稿</BulletItem>
            <BulletItem>スパム・広告・勧誘目的の投稿</BulletItem>
            <BulletItem>不正アクセス・クラッキング・フィッシング行為</BulletItem>
            <BulletItem>公序良俗に反するコンテンツの投稿</BulletItem>
            <BulletItem>法令に違反する行為</BulletItem>
            <BulletItem>本サービスの運営を妨害する行為</BulletItem>
          </ul>
        </SectionCard>

        <SectionCard title="投稿削除権限">
          <p className="text-sm text-slate-300 leading-7 mb-4">
            運営は、以下に該当する投稿を予告なく削除する権限を有します。
          </p>
          <ul className="space-y-2.5">
            <BulletItem>禁止事項に該当すると判断した投稿</BulletItem>
            <BulletItem>法令または公序良俗に違反する投稿</BulletItem>
            <BulletItem>他者の権利を侵害する投稿</BulletItem>
            <BulletItem>その他、運営が不適切と判断した投稿</BulletItem>
          </ul>
          <p className="text-sm text-slate-400 leading-relaxed mt-4 pl-5">
            削除に関する判断の理由は開示しない場合があります。
          </p>
        </SectionCard>

        <SectionCard title="著作権の扱い">
          <div className="space-y-3 text-sm text-slate-300 leading-7">
            <p>
              本サービスへの投稿コンテンツの著作権は、投稿者本人に帰属します。
              ただし投稿者は、本サービスの運営に必要な範囲において、投稿コンテンツを無償・非独占的に利用することを許諾するものとします。
            </p>
            <p className="text-slate-400">
              ※ 本サービスの運営に必要な利用とは、サービスの表示・配信・バックアップ等を指します。
            </p>
            <p>
              他者の著作物を無断で投稿することは禁止します。
            </p>
          </div>
        </SectionCard>

        <SectionCard title="ログ保持ポリシー">
          <p className="text-sm text-slate-300 leading-7 mb-4">
            本サービスは、不正利用の防止および法的対応のため、以下のログを保持します。
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-300">ログイン履歴（IP アドレス・ユーザーエージェント）</span>
              <span className="text-sm font-semibold text-indigo-300 ml-4 shrink-0">3年間</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-300">管理者操作の監査ログ</span>
              <span className="text-sm font-semibold text-indigo-300 ml-4 shrink-0">3年間</span>
            </div>
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">
            これらのログは、法令に基づく開示要請があった場合に提供することがあります。
          </p>
        </SectionCard>
      </div>

      <p className="text-indigo-300/30 text-xs mt-8 text-center">
        本規約は予告なく変更される場合があります。変更後の規約はこのページに掲載します。
      </p>
    </main>
  );
}
