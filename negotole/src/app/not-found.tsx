import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <p className="text-6xl font-bold text-slate-600">404</p>
        <h1 className="text-xl font-semibold text-slate-300">
          ページが見つかりません
        </h1>
        <p className="text-slate-500 text-sm">
          お探しのページは存在しないか、削除された可能性があります。
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition text-sm"
        >
          トップへ戻る
        </Link>
      </div>
    </div>
  );
}
