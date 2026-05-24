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
      <nav className="bg-gray-800 text-white px-6 py-3 flex gap-4 items-center">
        <span className="font-bold">管理パネル</span>
        <Link href="/admin/campaigns" className="hover:underline text-sm">
          キャンペーン管理
        </Link>
        <Link href="/" className="ml-auto hover:underline text-sm">
          サイトへ戻る
        </Link>
      </nav>
      <main className="p-6">{children}</main>
    </div>
  );
}
