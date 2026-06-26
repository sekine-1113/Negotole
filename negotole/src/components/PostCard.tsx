import Link from "next/link";
import { CountdownTimer } from "./CountdownTimer";
import { ReportButton } from "./ReportButton";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

type Props = {
  post: Post;
  isLoggedIn: boolean;
  onExpire?: () => void;
};

export function PostCard({ post, isLoggedIn, onExpire }: Props) {
  return (
    <article className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <p className="text-slate-100 whitespace-pre-wrap break-words text-sm mb-3">{post.content}</p>
      <div className="flex items-center justify-between gap-2">
        <CountdownTimer hiddenAt={post.hiddenAt} createdAt={post.createdAt} onExpire={onExpire} />
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
