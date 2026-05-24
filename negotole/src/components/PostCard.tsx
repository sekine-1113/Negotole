import { CountdownTimer } from "./CountdownTimer";

type Post = {
  id: number;
  content: string;
  hiddenAt: string;
  createdAt: string;
};

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="border border-gray-200 rounded-lg p-4 flex flex-col gap-2">
      <p className="text-gray-900 whitespace-pre-wrap break-words">{post.content}</p>
      <div className="flex justify-end">
        <CountdownTimer hiddenAt={post.hiddenAt} />
      </div>
    </article>
  );
}
