import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "お問い合わせ | negotole",
};

export default function ContactPage() {
  const contactUrl = process.env.NEXT_PUBLIC_CONTACT_FORM_URL ?? "#";

  return (
    <main className="px-4 py-10 max-w-2xl mx-auto">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-slate-100 mb-1">お問い合わせ</h1>
        <p className="text-indigo-300/50 text-xs">運営へのご連絡はこちらから</p>
      </div>

      <div className="space-y-4">
        <div className="bg-slate-900/40 border border-indigo-950/50 rounded-2xl p-6">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-100 mb-5">
            <span className="w-1 h-4 bg-indigo-500 rounded-full shrink-0" />
            一般的なお問い合わせ
          </h2>
          <p className="text-sm text-slate-300 leading-7 mb-6">
            本サービスに関するご意見・ご要望・不具合の報告などは、
            下記のフォームよりお送りください。
            内容を確認後、必要に応じてご連絡いたします。
          </p>
          <a
            href={contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            お問い合わせフォームを開く
            <span aria-hidden="true" className="text-base">↗</span>
          </a>
        </div>

        <div className="bg-slate-900/40 border border-indigo-950/50 rounded-2xl p-6">
          <h2 className="flex items-center gap-2.5 text-base font-semibold text-slate-100 mb-5">
            <span className="w-1 h-4 bg-rose-500 rounded-full shrink-0" />
            不適切なコンテンツの通報
          </h2>
          <p className="text-sm text-slate-300 leading-7">
            不適切な投稿を発見した場合は、各投稿に表示されている
            <span className="inline-block mx-1 px-2 py-0.5 bg-slate-800 rounded text-indigo-300/70 text-xs font-medium">通報</span>
            ボタンをご利用ください。ログインが必要です。
          </p>
        </div>
      </div>

      <p className="text-indigo-300/30 text-xs mt-8 text-center">
        ※ フォームは Google フォームを使用しています。送信には Google アカウントは不要です。
      </p>
    </main>
  );
}
