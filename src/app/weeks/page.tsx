import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { currentIsoWeek, formatIsoWeekRange, isoWeekLabel } from "@/lib/week";

export default async function WeeksIndexPage() {
  const user = await requireUser();
  const weeks = await prisma.week.findMany({
    where: { userId: user.id },
    include: { tasks: true },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
  });
  const cur = currentIsoWeek();

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">週一覧</h1>
        <Link
          href={`/weeks/${cur.isoYear}/${cur.isoWeek}`}
          className="rounded-md bg-brand px-3 py-1 text-sm text-white no-underline hover:bg-brand-dark"
        >
          今週を開く ({isoWeekLabel(cur)})
        </Link>
      </header>

      {weeks.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-slate-500">
          まだ週次レポートがありません。「今週を開く」で開始してください。
        </p>
      ) : (
        <ul className="divide-y rounded-md border border-slate-200 bg-white">
          {weeks.map((w) => {
            const done = w.tasks.filter((t) => t.completed).length;
            const total = w.tasks.length;
            const rate = total === 0 ? 0 : Math.round((done / total) * 100);
            return (
              <li key={w.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <Link
                    href={`/weeks/${w.isoYear}/${w.isoWeek}`}
                    className="font-medium no-underline"
                  >
                    {isoWeekLabel(w)}
                  </Link>
                  <span className="ml-3 text-xs text-slate-500">
                    {formatIsoWeekRange(w)}
                  </span>
                </div>
                <div className="text-sm text-slate-600">
                  {done}/{total} ({rate}%)
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
