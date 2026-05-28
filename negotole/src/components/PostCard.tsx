import { CountdownTimer } from "./CountdownTimer";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="bg-slate-900/60 border border-indigo-950/70 rounded-2xl p-4 backdrop-blur-md shadow-xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <p className="text-slate-100 whitespace-pre-wrap break-words text-sm mb-3">{post.content}</p>
      <CountdownTimer hiddenAt={post.hiddenAt} createdAt={post.createdAt} />
    </article>
  );
}
