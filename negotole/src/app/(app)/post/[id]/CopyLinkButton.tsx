"use client";

export function CopyLinkButton({ postUrl }: { postUrl: string }) {
  return (
    <button
      onClick={() => {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(postUrl);
        }
      }}
      className="flex items-center justify-center gap-2 w-full py-3 border border-indigo-950/50 text-indigo-300 text-sm rounded-2xl hover:bg-slate-900/40 transition"
    >
      リンクをコピー
    </button>
  );
}
