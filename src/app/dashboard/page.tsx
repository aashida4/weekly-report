import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isoWeekLabel } from "@/lib/week";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter === "open" ? "open" : sp.filter === "done" ? "done" : "all";
  const user = await requireUser();

  const tasks = await prisma.task.findMany({
    where: {
      week: { userId: user.id },
      ...(filter === "open" ? { completed: false } : {}),
      ...(filter === "done" ? { completed: true } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { details: { contains: q } }] } : {}),
    },
    include: { week: { select: { isoYear: true, isoWeek: true } } },
    orderBy: [{ week: { isoYear: "desc" } }, { week: { isoWeek: "desc" } }, { order: "asc" }],
    take: 500,
  });

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">全タスク</h1>
        <div className="text-sm text-slate-600">
          {done}/{total} 完了
        </div>
      </header>

      <form className="mb-4 flex flex-wrap items-center gap-2" action="/dashboard">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="検索（タイトル・詳細）"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          name="filter"
          defaultValue={filter}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">全て</option>
          <option value="open">未完了のみ</option>
          <option value="done">完了のみ</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-700"
        >
          適用
        </button>
      </form>

      {tasks.length === 0 ? (
        <p className="rounded-md border border-dashed border-slate-300 p-6 text-center text-slate-500">
          条件に合うタスクがありません。
        </p>
      ) : (
        <ul className="divide-y rounded-md border border-slate-200 bg-white">
          {tasks.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <span
                className={`h-2 w-2 rounded-full ${
                  t.completed ? "bg-emerald-500" : "bg-slate-300"
                }`}
              />
              <Link
                href={`/weeks/${t.week.isoYear}/${t.week.isoWeek}`}
                className={`flex-1 no-underline ${
                  t.completed ? "text-slate-500 line-through" : "text-slate-800"
                }`}
              >
                {t.title}
              </Link>
              <span className="text-xs text-slate-500">
                {isoWeekLabel({ isoYear: t.week.isoYear, isoWeek: t.week.isoWeek })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
