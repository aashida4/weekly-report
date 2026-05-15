import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { currentIsoWeek, getOrCreateWeek, isoWeekLabel } from "@/lib/week";
import TaskList from "@/components/TaskList";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; filter?: string; scope?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const filter = sp.filter === "open" ? "open" : sp.filter === "done" ? "done" : "all";
  const scope =
    sp.scope === "pool" ? "pool" : sp.scope === "assigned" ? "assigned" : "all";
  const user = await requireUser();

  // Ensure current week exists so the dashboard add-button can target it
  const cur = currentIsoWeek();
  const currentWeek = await getOrCreateWeek(user.id, cur);

  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      archived: false,
      ...(filter === "open" ? { completed: false } : {}),
      ...(filter === "done" ? { completed: true } : {}),
      ...(scope === "pool" ? { weekId: null } : {}),
      ...(scope === "assigned" ? { NOT: { weekId: null } } : {}),
      ...(q ? { OR: [{ title: { contains: q } }, { details: { contains: q } }] } : {}),
    },
    include: { week: { select: { isoYear: true, isoWeek: true } } },
    orderBy: [
      { weekId: "asc" }, // NULL first in SQLite, but order is roughly week-wise
      { order: "asc" },
      { createdAt: "asc" },
    ],
    take: 1000,
  });

  const total = tasks.length;
  const done = tasks.filter((t) => t.completed).length;

  const weeks = await prisma.week.findMany({
    where: { userId: user.id },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
    take: 12,
    select: { id: true, isoYear: true, isoWeek: true },
  });
  const weekOptions = weeks.map((w) => ({
    id: w.id,
    label: isoWeekLabel({ isoYear: w.isoYear, isoWeek: w.isoWeek }),
  }));

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
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
          name="scope"
          defaultValue={scope}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">全て</option>
          <option value="pool">プールのみ</option>
          <option value="assigned">週に割当済み</option>
        </select>
        <select
          name="filter"
          defaultValue={filter}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">完了状態:全て</option>
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

      <TaskList
        context="dashboard"
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          details: t.details,
          completed: t.completed,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
          week: t.week
            ? { isoYear: t.week.isoYear, isoWeek: t.week.isoWeek }
            : null,
        }))}
        defaultWeekId={null}
        weekOptions={[
          { id: currentWeek.id, label: `今週 (${isoWeekLabel(cur)})` },
          ...weekOptions.filter((w) => w.id !== currentWeek.id),
        ]}
      />
    </div>
  );
}
