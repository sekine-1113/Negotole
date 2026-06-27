"use client";

import { useState } from "react";

export function CopyLinkButton({ postUrl }: { postUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);
      } else {
        const el = document.createElement("textarea");
        el.value = postUrl;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center justify-center gap-2 w-full py-3 border border-indigo-950/50 text-indigo-300 text-sm rounded-2xl hover:bg-slate-900/40 transition"
    >
      {copied ? "✓ コピーしました！" : "リンクをコピー"}
    </button>
  );
}
