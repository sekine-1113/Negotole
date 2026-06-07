"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlignLeft, User, ShieldAlert } from "lucide-react";

type Props = {
  isAdmin: boolean;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function BottomNav({ isAdmin }: Props) {
  const pathname = usePathname();

  const navItems: NavItem[] = [
    {
      href: "/",
      label: "タイムライン",
      icon: <AlignLeft className="w-5 h-5" />,
    },
    {
      href: "/mypage",
      label: "マイページ",
      icon: <User className="w-5 h-5" />,
    },
  ];

  if (isAdmin) {
    navItems.push({
      href: "/admin/campaigns",
      label: "管理",
      icon: <ShieldAlert className="w-5 h-5" />,
    });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md bg-slate-950/80 border-t border-indigo-950/60 py-2 md:hidden">
      <div className="max-w-xl mx-auto px-4 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center transition ${
                isActive
                  ? "text-indigo-400"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {item.icon}
              <span className="text-[10px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
