"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";

type Props = {
  isLoggedIn: boolean;
};

export function FabButton({ isLoggedIn }: Props) {
  const pathname = usePathname();
  if (!isLoggedIn || pathname === "/post/new") return null;

  return (
    <Link
      href="/post/new"
      className="fixed bottom-20 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/40 hover:shadow-indigo-500/60 hover:scale-105 active:scale-95 transition-all duration-200"
      title="寝言を放つ"
    >
      <Plus className="w-6 h-6" />
    </Link>
  );
}
