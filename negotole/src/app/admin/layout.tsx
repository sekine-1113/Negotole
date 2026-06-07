import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div>
      <nav className="bg-slate-900/80 backdrop-blur-md border-b border-indigo-950/50 px-6 py-3 flex gap-4 items-center">
        <span className="font-bold text-indigo-200">管理パネル</span>
        <Link href="/admin/campaigns" className="text-indigo-300 hover:text-indigo-100 text-sm transition">
          キャンペーン管理
        </Link>
        <Link href="/admin/posts" className="text-indigo-300 hover:text-indigo-100 text-sm transition">
          投稿管理
        </Link>
        <Link href="/" className="ml-auto text-indigo-300 hover:text-indigo-100 text-sm transition">
          サイトへ戻る
        </Link>
      </nav>
      <main className="p-4 sm:p-6">{children}</main>
    </div>
  );
}
