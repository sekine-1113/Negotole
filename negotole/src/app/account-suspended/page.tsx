import { signOut } from "@/lib/auth";

export default function AccountSuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="max-w-md w-full mx-4 text-center space-y-6">
        <h1 className="text-2xl font-bold text-red-400">アカウントが停止されています</h1>
        <p className="text-slate-400">
          このアカウントは管理者によって停止されました。
          ご不明な点がある場合はお問い合わせください。
        </p>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
          >
            サインアウト
          </button>
        </form>
      </div>
    </div>
  );
}
