import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatIsoWeekRange, isoWeekLabel } from "@/lib/week";

export default async function AdminUserWeeksPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  await requireAdmin();
  const { userId } = await params;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      weeks: {
        orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
        include: { tasks: true, _count: { select: { feedbacks: true } } },
      },
    },
  });
  if (!user) notFound();

  return (
    <div>
      <header className="mb-6">
        <Link href="/admin" className="text-sm no-underline">
          ← 管理者ダッシュボード
        </Link>
        <h1 className="mt-2 text-2xl font-bold">{user.name || user.email}</h1>
        <p className="text-sm text-slate-500">{user.email} · {user.role}</p>
      </header>

      {user.weeks.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-slate-500">
          まだ週次レポートがありません。
        </p>
      ) : (
        <ul className="divide-y rounded-md border border-slate-200 bg-white">
          {user.weeks.map((w) => {
            const total = w.tasks.length;
            const done = w.tasks.filter((t) => t.completed).length;
            const rate = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/admin/users/${user.id}/weeks/${w.isoYear}/${w.isoWeek}`}
                    className="font-medium no-underline"
                  >
                    {isoWeekLabel({ isoYear: w.isoYear, isoWeek: w.isoWeek })}
                  </Link>
                  <span className="ml-3 text-xs text-slate-500">
                    {formatIsoWeekRange({ isoYear: w.isoYear, isoWeek: w.isoWeek })}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {done}/{total} ({rate}%) · FB {w._count.feedbacks}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
