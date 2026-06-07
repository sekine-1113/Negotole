"use client";

type Props = {
  postId: number;
};

export function ReportButton({ postId }: Props) {
  const baseUrl = process.env.NEXT_PUBLIC_REPORT_FORM_URL;
  const href = baseUrl ? `${baseUrl}?entry.PLACEHOLDER=postId:${postId}` : "#";

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-indigo-300/40 hover:text-indigo-300/70 transition-colors whitespace-nowrap"
      aria-label="この投稿を通報する"
    >
      通報
    </a>
  );
}
