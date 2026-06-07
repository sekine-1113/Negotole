import Link from "next/link";
import { Moon } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-indigo-950/40 bg-slate-950/30">
      <div className="max-w-xl md:max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
              <Moon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-black tracking-wider bg-gradient-to-r from-indigo-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                negotole
              </p>
              <p className="text-[10px] text-indigo-300/40 tracking-widest -mt-0.5">
                儚く消える、夜のつぶやき
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-1 text-xs text-indigo-300/50">
            <Link href="/terms" className="hover:text-indigo-300/80 transition-colors whitespace-nowrap px-3 py-1">
              利用規約
            </Link>
            <span className="text-indigo-950/80">·</span>
            <Link href="/privacy" className="hover:text-indigo-300/80 transition-colors whitespace-nowrap px-3 py-1">
              プライバシーポリシー
            </Link>
            <span className="text-indigo-950/80">·</span>
            <Link href="/contact" className="hover:text-indigo-300/80 transition-colors whitespace-nowrap px-3 py-1">
              お問い合わせ
            </Link>
          </nav>
        </div>

        <p className="text-[10px] text-indigo-300/25 mt-6 sm:text-right">
          © 2026 negotole
        </p>
      </div>
    </footer>
  );
}
