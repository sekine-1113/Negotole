import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "プライバシーポリシー | negotole",
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

export default function PrivacyPage() {
  return (
    <main className="px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">プライバシーポリシー</h1>
        <p className="text-indigo-300/50 text-xs">最終更新日: 2026年6月7日</p>
      </div>

      <div className="bg-indigo-950/30 border border-indigo-500/20 rounded-2xl px-6 py-5 mb-6 text-sm text-slate-300 leading-7">
        negotole（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の適切な保護に努めます。
        本プライバシーポリシーは、本サービスが収集・利用する情報について説明します。
      </div>

      <div className="space-y-4">
        <SectionCard title="収集する個人情報の種類">
          <ul className="space-y-2.5">
            <BulletItem>メールアドレス（Google アカウントでのログイン時）</BulletItem>
            <BulletItem>ログイン時の IP アドレス</BulletItem>
            <BulletItem>ユーザーエージェント（ブラウザ・OS の情報）</BulletItem>
            <BulletItem>投稿コンテンツ</BulletItem>
            <BulletItem>ポイント利用履歴</BulletItem>
          </ul>
        </SectionCard>

        <SectionCard title="利用目的">
          <ul className="space-y-2.5">
            <BulletItem>本サービスの提供・運営</BulletItem>
            <BulletItem>ユーザー認証および本人確認</BulletItem>
            <BulletItem>不正アクセス・不正利用の検知および防止</BulletItem>
            <BulletItem>法的要請への対応</BulletItem>
            <BulletItem>サービスの改善・分析</BulletItem>
          </ul>
        </SectionCard>

        <SectionCard title="第三者への提供">
          <p className="text-sm text-slate-300 leading-7 mb-4">
            本サービスは、以下の場合を除き、収集した個人情報を第三者に提供しません。
          </p>
          <ul className="space-y-2.5">
            <BulletItem>法令に基づく開示要請があった場合</BulletItem>
            <BulletItem>人の生命・身体・財産の保護のために必要な場合</BulletItem>
            <BulletItem>ユーザー本人の同意がある場合</BulletItem>
          </ul>
        </SectionCard>

        <SectionCard title="ログ保持期間">
          <div className="space-y-2">
            <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-300">ログイン履歴（IP アドレス・ユーザーエージェント）</span>
              <span className="text-sm font-semibold text-indigo-300 ml-4 shrink-0">3年間</span>
            </div>
            <div className="flex items-center justify-between bg-slate-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-300">管理者操作の監査ログ</span>
              <span className="text-sm font-semibold text-indigo-300 ml-4 shrink-0">3年間</span>
            </div>
            <div className="flex items-start justify-between bg-slate-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-slate-300">投稿コンテンツ</span>
              <span className="text-sm font-semibold text-indigo-300/70 ml-4 shrink-0 text-right">論理削除後も保持<br />（監査目的）</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="利用している外部サービス">
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            本サービスは以下の外部サービスを利用しており、各サービスのプライバシーポリシーが適用されます。
          </p>
          <div className="space-y-2">
            {[
              { name: "Google OAuth", desc: "ユーザー認証" },
              { name: "Neon / PostgreSQL", desc: "データベース（ユーザー情報・投稿・ログ）" },
              { name: "Upstash Redis", desc: "レート制限処理" },
              { name: "Vercel", desc: "ホスティング・アクセスログ・アナリティクス" },
            ].map(({ name, desc }) => (
              <div key={name} className="flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-slate-200 shrink-0 w-40">{name}</span>
                <span className="text-sm text-slate-400">{desc}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="お問い合わせ">
          <p className="text-sm text-slate-300 leading-7">
            個人情報の取り扱いに関するお問い合わせは、
            <Link href="/contact" className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 mx-1 transition-colors">
              お問い合わせフォーム
            </Link>
            よりご連絡ください。
          </p>
        </SectionCard>
      </div>

      <p className="text-indigo-300/30 text-xs mt-8 text-center">
        本ポリシーは予告なく変更される場合があります。変更後のポリシーはこのページに掲載します。
      </p>
    </main>
  );
}
