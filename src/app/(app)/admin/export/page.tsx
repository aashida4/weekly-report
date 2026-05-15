import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export default async function AdminExportPage() {
  await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: { id: true, email: true, name: true, role: true },
  });

  return (
    <div className="max-w-2xl">
      <Link href="/admin" className="text-sm no-underline">
        ← 管理者ダッシュボード
      </Link>
      <h1 className="mt-2 text-2xl font-bold">データエクスポート</h1>
      <p className="mt-2 text-sm text-slate-600">
        条件を選んで CSV / JSON でダウンロードできます。空欄は「制限なし」を意味します。
      </p>

      <form action="/api/admin/export" method="GET" className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700">対象ユーザー</label>
          <select
            name="userId"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">全ユーザー</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email} ({u.role})
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-700">From (YYYY-Www)</label>
            <input
              name="from"
              placeholder="例: 2026-W18"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-700">To (YYYY-Www)</label>
            <input
              name="to"
              placeholder="例: 2026-W22"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm text-slate-700">フォーマット</label>
          <select
            name="format"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="csv">CSV (タスク × 行)</option>
            <option value="json">JSON (ユーザー → 週 → 詳細)</option>
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-brand px-4 py-2 text-sm text-white hover:bg-brand-dark"
        >
          ダウンロード
        </button>
      </form>
    </div>
  );
}
