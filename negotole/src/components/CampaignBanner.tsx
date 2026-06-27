import type { Campaign } from "@/lib/db/schema";
import Link from "next/link";

type Props = {
  campaign: Campaign;
  isLoggedIn: boolean;
};

export function CampaignBanner({ campaign, isLoggedIn }: Props) {
  return (
    <div className="mb-4 relative overflow-hidden rounded-2xl border border-purple-500/40 bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-indigo-900/60 backdrop-blur-md p-4 shadow-xl">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-purple-400/60 to-transparent" />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wider mb-0.5">
            キャンペーン開催中
          </p>
          <p className="text-sm font-bold text-white">{campaign.name}</p>
          <p className="text-xs text-indigo-300 mt-0.5">
            ログインで <span className="text-yellow-300 font-bold">+{campaign.bonusPoints}pt</span> ゲット
          </p>
        </div>
        {!isLoggedIn && (
          <Link
            href="/api/auth/signin"
            className="shrink-0 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
          >
            ログイン
          </Link>
        )}
      </div>
    </div>
  );
}
