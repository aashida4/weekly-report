import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { formatIsoWeekRange, isoWeekLabel } from "@/lib/week";
import WeekViewReadOnly from "@/components/WeekViewReadOnly";

export default async function AdminWeekPage({
  params,
}: {
  params: Promise<{ userId: string; isoYear: string; isoWeek: string }>;
}) {
  await requireAdmin();
  const { userId, isoYear: yearStr, isoWeek: weekStr } = await params;
  const isoYear = Number(yearStr);
  const isoWeek = Number(weekStr);
  if (!Number.isInteger(isoYear) || !Number.isInteger(isoWeek)) notFound();

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) notFound();

  const week = await prisma.week.findUnique({
    where: { userId_isoYear_isoWeek: { userId, isoYear, isoWeek } },
    include: {
      tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      reflection: true,
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!week) notFound();

  return (
    <div className="space-y-6">
      <header>
        <Link href={`/admin/users/${user.id}`} className="text-sm no-underline">
          ← {user.name || user.email}
        </Link>
        <h1 className="mt-2 text-2xl font-bold">
          {isoWeekLabel({ isoYear, isoWeek })}
          <span className="ml-3 text-sm font-normal text-slate-500">
            {formatIsoWeekRange({ isoYear, isoWeek })}
          </span>
        </h1>
        <p className="text-xs text-slate-500">読み取り専用</p>
      </header>

      <WeekViewReadOnly
        tasks={week.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          details: t.details,
          completed: t.completed,
          completedAt: t.completedAt ? t.completedAt.toISOString() : null,
        }))}
        reflection={
          week.reflection
            ? {
                good: week.reflection.good,
                bad: week.reflection.bad,
                consult: week.reflection.consult,
              }
            : null
        }
        feedbacks={week.feedbacks.map((f) => ({
          id: f.id,
          kind: f.kind,
          content: f.content,
          model: f.model,
          createdAt: f.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
