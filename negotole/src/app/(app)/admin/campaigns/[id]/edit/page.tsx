"use client";

import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";

type Campaign = {
  id: number;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  bonusPoints: number;
  pointsType: string;
  isActive: boolean;
};

export default function EditCampaignPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch(`/api/admin/campaigns/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.campaign) {
          setCampaign(data.campaign);
        } else {
          setError(data.error ?? "キャンペーンが見つかりません。");
        }
      })
      .catch(() => setError("読み込みに失敗しました。"));
  }, [id]);

  function toLocalDatetime(iso: string) {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const form = e.currentTarget;
    const data = {
      name: (form.elements.namedItem("name") as HTMLInputElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value || null,
      startsAt: new Date((form.elements.namedItem("startsAt") as HTMLInputElement).value).toISOString(),
      endsAt: new Date((form.elements.namedItem("endsAt") as HTMLInputElement).value).toISOString(),
      bonusPoints: Number((form.elements.namedItem("bonusPoints") as HTMLInputElement).value),
      pointsType: (form.elements.namedItem("pointsType") as HTMLInputElement).value,
    };

    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/admin/campaigns");
      } else {
        const json = await res.json();
        setError(json.error ?? "エラーが発生しました。");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!confirm("このキャンペーンを削除しますか？")) return;
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/campaigns/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/admin/campaigns");
      } else {
        const json = await res.json();
        setError(json.error ?? "削除に失敗しました。");
      }
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  if (!campaign && !error) {
    return <p className="text-gray-500">読み込み中...</p>;
  }

  if (error && !campaign) {
    return <p className="text-red-600">{error}</p>;
  }

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold mb-6">キャンペーン編集</h1>

      {error && (
        <div className="bg-red-100 text-red-800 border border-red-300 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="name">
            キャンペーン名 <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={255}
            defaultValue={campaign!.name}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="description">
            説明
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={campaign!.description ?? ""}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="startsAt">
            開始日時 <span className="text-red-500">*</span>
          </label>
          <input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetime(campaign!.startsAt)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="endsAt">
            終了日時 <span className="text-red-500">*</span>
          </label>
          <input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            required
            defaultValue={toLocalDatetime(campaign!.endsAt)}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="bonusPoints">
            付与ポイント <span className="text-red-500">*</span>
          </label>
          <input
            id="bonusPoints"
            name="bonusPoints"
            type="number"
            required
            min={1}
            step={1}
            defaultValue={campaign!.bonusPoints}
            className="w-full border rounded px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">ポイント種別 <span className="text-red-500">*</span></label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="pointsType" value="permanent" defaultChecked={campaign!.pointsType === "permanent"} className="accent-indigo-500" />
              <span className="text-sm">恒久（無期限）</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="pointsType" value="limited" defaultChecked={campaign!.pointsType === "limited"} className="accent-indigo-500" />
              <span className="text-sm">期間限定（キャンペーン終了日まで）</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 text-sm disabled:opacity-50"
          >
            {submitting ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/campaigns")}
            className="border px-4 py-2 rounded hover:bg-gray-50 text-sm"
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="ml-auto bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 text-sm disabled:opacity-50"
          >
            {deleting ? "削除中..." : "削除"}
          </button>
        </div>
      </form>
    </div>
  );
}
