"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="max-w-xl mx-auto px-4 py-8 text-center">
      <p className="text-gray-500 mb-4">読み込みに失敗しました</p>
      <button onClick={reset} className="text-sm underline text-gray-600">
        再試行
      </button>
    </main>
  );
}
