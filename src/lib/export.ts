import { prisma } from "./db";
import { type IsoWeek, parseIsoWeekLabel } from "./week";

export type ExportFilter = {
  userId?: string;
  from?: IsoWeek | null;
  to?: IsoWeek | null;
};

export function parseExportRange(params: URLSearchParams): ExportFilter {
  const userId = params.get("userId") || undefined;
  const fromLabel = params.get("from");
  const toLabel = params.get("to");
  return {
    userId,
    from: fromLabel ? parseIsoWeekLabel(fromLabel) : null,
    to: toLabel ? parseIsoWeekLabel(toLabel) : null,
  };
}

function compareIsoWeek(a: IsoWeek, b: IsoWeek): number {
  if (a.isoYear !== b.isoYear) return a.isoYear - b.isoYear;
  return a.isoWeek - b.isoWeek;
}

export async function fetchExportData(filter: ExportFilter) {
  const weeks = await prisma.week.findMany({
    where: filter.userId ? { userId: filter.userId } : undefined,
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      tasks: { orderBy: [{ order: "asc" }, { createdAt: "asc" }] },
      reflection: true,
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
    orderBy: [{ userId: "asc" }, { isoYear: "asc" }, { isoWeek: "asc" }],
  });
  return weeks.filter((w) => {
    const wk: IsoWeek = { isoYear: w.isoYear, isoWeek: w.isoWeek };
    if (filter.from && compareIsoWeek(wk, filter.from) < 0) return false;
    if (filter.to && compareIsoWeek(wk, filter.to) > 0) return false;
    return true;
  });
}

type WeekWithDetails = Awaited<ReturnType<typeof fetchExportData>>[number];

function csvEscape(s: string | null | undefined): string {
  const v = s ?? "";
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

const CSV_HEADERS = [
  "user_email",
  "user_name",
  "iso_year",
  "iso_week",
  "task_title",
  "task_completed",
  "task_details",
  "reflection_good",
  "reflection_bad",
  "reflection_consult",
  "feedback_progress_latest",
  "feedback_goal_setting_latest",
  "week_created_at",
  "week_updated_at",
];

export function buildCsvStream(weeks: WeekWithDetails[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let i = 0;
  let buffer: string[] = [CSV_HEADERS.join(",")];

  function emitWeek(w: WeekWithDetails): string {
    const progressLatest = w.feedbacks.find((f) => f.kind === "progress")?.content ?? "";
    const goalLatest = w.feedbacks.find((f) => f.kind === "goal_setting")?.content ?? "";
    const ref = w.reflection;
    const rows: string[] = [];
    const baseCols = [
      csvEscape(w.user.email),
      csvEscape(w.user.name),
      String(w.isoYear),
      String(w.isoWeek),
    ];
    if (w.tasks.length === 0) {
      rows.push(
        [
          ...baseCols,
          "",
          "",
          "",
          csvEscape(ref?.good),
          csvEscape(ref?.bad),
          csvEscape(ref?.consult),
          csvEscape(progressLatest),
          csvEscape(goalLatest),
          w.createdAt.toISOString(),
          w.updatedAt.toISOString(),
        ].join(","),
      );
    } else {
      for (const t of w.tasks) {
        rows.push(
          [
            ...baseCols,
            csvEscape(t.title),
            t.completed ? "true" : "false",
            csvEscape(t.details),
            csvEscape(ref?.good),
            csvEscape(ref?.bad),
            csvEscape(ref?.consult),
            csvEscape(progressLatest),
            csvEscape(goalLatest),
            w.createdAt.toISOString(),
            w.updatedAt.toISOString(),
          ].join(","),
        );
      }
    }
    return rows.join("\n");
  }

  return new ReadableStream({
    pull(controller) {
      while (buffer.length > 0) {
        controller.enqueue(encoder.encode(buffer.shift() + "\n"));
      }
      if (i < weeks.length) {
        buffer.push(emitWeek(weeks[i]));
        i++;
        return;
      }
      controller.close();
    },
  });
}

export function buildJson(weeks: WeekWithDetails[]) {
  type UserBlock = {
    id: string;
    email: string;
    name: string | null;
    role: string;
    weeks: unknown[];
  };
  const byUser = new Map<string, UserBlock>();
  for (const w of weeks) {
    if (!byUser.has(w.user.id)) {
      byUser.set(w.user.id, {
        id: w.user.id,
        email: w.user.email,
        name: w.user.name,
        role: w.user.role,
        weeks: [],
      });
    }
    byUser.get(w.user.id)!.weeks.push({
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
      tasks: w.tasks.map((t) => ({
        title: t.title,
        details: t.details,
        completed: t.completed,
        order: t.order,
      })),
      reflection: w.reflection
        ? {
            good: w.reflection.good,
            bad: w.reflection.bad,
            consult: w.reflection.consult,
          }
        : null,
      feedbacks: w.feedbacks.map((f) => ({
        kind: f.kind,
        model: f.model,
        content: f.content,
        createdAt: f.createdAt,
      })),
    });
  }
  return { exportedAt: new Date().toISOString(), users: Array.from(byUser.values()) };
}
