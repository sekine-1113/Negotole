"use client";

import { useState } from "react";
import Link from "next/link";
import { CountdownTimer } from "./CountdownTimer";
import { ReportButton } from "./ReportButton";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

function contentFontSize(len: number): string {
  if (len <= 30) return "text-xl";
  if (len <= 80) return "text-base";
  if (len <= 150) return "text-sm";
  return "text-xs";
}

// userId は受け取らない（ブラインドポスト設計原則）
type Props = {
  post: Post;
  isLoggedIn: boolean;
  onExpire?: () => void;
  showCountdown?: boolean;
};

export function PostCard({ post, isLoggedIn, onExpire, showCountdown = true }: Props) {
  const [isNearExpiry, setIsNearExpiry] = useState(
    () => new Date(post.hiddenAt).getTime() - Date.now() <= 300_000
  );

  return (
    <article className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <p className={`text-slate-100 whitespace-pre-wrap break-words ${contentFontSize(post.content.length)} mb-3 ${isNearExpiry ? "animate-wobble" : ""}`}>
        {post.content}
      </p>
      <div className="flex items-center justify-between gap-2">
        {/* hiddenでもマウントし続け、onExpire(期限切れ削除)を維持する */}
        <div className={showCountdown ? "flex-1" : "hidden"}>
          <CountdownTimer
            hiddenAt={post.hiddenAt}
            createdAt={post.createdAt}
            onExpire={onExpire}
            onNearExpiry={() => setIsNearExpiry(true)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/post/${post.id}`}
            className="text-xs text-indigo-300/40 hover:text-indigo-300/70 transition-colors whitespace-nowrap"
            aria-label="この投稿をシェア"
          >
            シェア
          </Link>
          {isLoggedIn && <ReportButton postId={post.id} />}
        </div>
      </div>
    </article>
  );
}
