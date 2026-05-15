import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  formatIsoWeekRange,
  getOrCreateWeek,
  isoWeekLabel,
  shiftIsoWeek,
} from "@/lib/week";
import TaskList from "@/components/TaskList";
import ReflectionPanel from "@/components/ReflectionPanel";
import FeedbackPanel from "@/components/FeedbackPanel";

export default async function WeekPage({
  params,
}: {
  params: Promise<{ isoYear: string; isoWeek: string }>;
}) {
  const { isoYear: yearStr, isoWeek: weekStr } = await params;
  const isoYear = Number(yearStr);
  const isoWeek = Number(weekStr);
  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) notFound();
  if (isoWeek < 1 || isoWeek > 53) notFound();

  const user = await requireUser();
  const week = await getOrCreateWeek(user.id, { isoYear, isoWeek });

  const [tasks, reflection, feedbacks] = await Promise.all([
    prisma.task.findMany({
      where: { weekId: week.id },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    }),
    prisma.reflection.findUnique({ where: { weekId: week.id } }),
    prisma.feedback.findMany({
      where: { weekId: week.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const prev = shiftIsoWeek({ isoYear, isoWeek }, -1);
  const next = shiftIsoWeek({ isoYear, isoWeek }, 1);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {isoWeekLabel({ isoYear, isoWeek })}
            <span className="ml-3 text-sm font-normal text-slate-500">
              {formatIsoWeekRange({ isoYear, isoWeek })}
            </span>
          </h1>
        </div>
        <nav className="flex gap-2 text-sm">
          <Link
            href={`/weeks/${prev.isoYear}/${prev.isoWeek}`}
            className="rounded-md border border-slate-300 px-3 py-1 no-underline text-slate-700 hover:bg-slate-100"
          >
            ← 前週
          </Link>
          <Link
            href="/weeks"
            className="rounded-md border border-slate-300 px-3 py-1 no-underline text-slate-700 hover:bg-slate-100"
          >
            一覧
          </Link>
          <Link
            href={`/weeks/${next.isoYear}/${next.isoWeek}`}
            className="rounded-md border border-slate-300 px-3 py-1 no-underline text-slate-700 hover:bg-slate-100"
          >
            次週 →
          </Link>
        </nav>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">今週のタスク</h2>
        <TaskList
          weekId={week.id}
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            details: t.details,
            completed: t.completed,
          }))}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">振り返り</h2>
        <ReflectionPanel
          weekId={week.id}
          initial={{
            good: reflection?.good ?? "",
            bad: reflection?.bad ?? "",
            consult: reflection?.consult ?? "",
          }}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">LLM フィードバック</h2>
        <FeedbackPanel
          weekId={week.id}
          feedbacks={feedbacks.map((f) => ({
            id: f.id,
            kind: f.kind,
            content: f.content,
            model: f.model,
            createdAt: f.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}
