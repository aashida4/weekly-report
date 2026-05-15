import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { isoWeekLabel } from "@/lib/week";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdmin();
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const users = await prisma.user.findMany({
    where: query
      ? { OR: [{ email: { contains: query } }, { name: { contains: query } }] }
      : undefined,
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    include: {
      weeks: {
        orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
        take: 1,
        include: { tasks: true, reflection: true, _count: { select: { feedbacks: true } } },
      },
      _count: { select: { weeks: true } },
    },
  });

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">管理者ダッシュボード</h1>
        <Link
          href="/admin/export"
          className="rounded-md bg-brand px-3 py-1 text-sm text-white no-underline hover:bg-brand-dark"
        >
          データエクスポート
        </Link>
      </header>

      <form className="mb-4 flex gap-2" action="/admin">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="ユーザー検索 (メール / 名前)"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          検索
        </button>
      </form>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-2">ユーザー</th>
              <th className="px-3 py-2">ロール</th>
              <th className="px-3 py-2">週数</th>
              <th className="px-3 py-2">最新週</th>
              <th className="px-3 py-2">完了率</th>
              <th className="px-3 py-2">Reflection</th>
              <th className="px-3 py-2">最終更新</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => {
              const w = u.weeks[0];
              const total = w?.tasks.length ?? 0;
              const done = w?.tasks.filter((t) => t.completed).length ?? 0;
              const rate = total === 0 ? "—" : `${Math.round((done / total) * 100)}%`;
              const ref = w?.reflection;
              const hasRef = !!(ref?.good || ref?.bad || ref?.consult);
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2">
                    <div className="font-medium">{u.name || "(no name)"}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">{u._count.weeks}</td>
                  <td className="px-3 py-2">
                    {w ? isoWeekLabel({ isoYear: w.isoYear, isoWeek: w.isoWeek }) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {rate} {total > 0 && <span className="text-xs text-slate-500">({done}/{total})</span>}
                  </td>
                  <td className="px-3 py-2">
                    {hasRef ? (
                      <span className="text-emerald-600">記入あり</span>
                    ) : (
                      <span className="text-slate-400">未</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-500">
                    {w ? new Date(w.updatedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-xs no-underline text-brand hover:text-brand-dark"
                    >
                      週を見る →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
