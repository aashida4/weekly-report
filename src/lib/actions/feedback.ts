"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { callLLM } from "@/lib/llm";
import {
  buildGoalSettingPrompt,
  buildProgressPrompt,
  type WeekContext,
} from "@/lib/prompts";

type Kind = "progress" | "goal_setting";

const HISTORY_WEEKS = 3;
const PREV_ADVICE_CHARS = 600;

async function loadWeekForUser(weekId: string) {
  const user = await requireUser();
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { tasks: { orderBy: { order: "asc" } }, reflection: true },
  });
  if (!week || week.userId !== user.id) throw new Error("Not found");
  return { user, week };
}

async function loadHistory(
  userId: string,
  current: { isoYear: number; isoWeek: number },
): Promise<WeekContext[]> {
  const past = await prisma.week.findMany({
    where: {
      userId,
      OR: [
        { isoYear: { lt: current.isoYear } },
        { isoYear: current.isoYear, isoWeek: { lt: current.isoWeek } },
      ],
    },
    orderBy: [{ isoYear: "desc" }, { isoWeek: "desc" }],
    take: HISTORY_WEEKS,
    include: {
      tasks: { orderBy: { order: "asc" } },
      reflection: true,
      feedbacks: { orderBy: { createdAt: "desc" } },
    },
  });
  // chronological (old → new)
  past.reverse();
  return past.map((w) => {
    const progress = w.feedbacks.find((f) => f.kind === "progress");
    const goal = w.feedbacks.find((f) => f.kind === "goal_setting");
    return {
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      tasks: w.tasks.map((t) => ({
        title: t.title,
        details: t.details,
        completed: t.completed,
        completedAt: t.completedAt ? t.completedAt.toISOString() : null,
      })),
      reflection: {
        good: w.reflection?.good ?? "",
        bad: w.reflection?.bad ?? "",
        consult: w.reflection?.consult ?? "",
      },
      previousProgressAdvice: progress?.content.slice(0, PREV_ADVICE_CHARS) ?? null,
      previousGoalSettingAdvice: goal?.content.slice(0, PREV_ADVICE_CHARS) ?? null,
    };
  });
}

export async function generateFeedback({
  weekId,
  kind,
}: {
  weekId: string;
  kind: Kind;
}): Promise<{ ok: true; content: string } | { ok: false; error: string }> {
  try {
    const { user, week } = await loadWeekForUser(weekId);
    const userLabel = user.name || user.email || "(unknown)";
    const tasks = week.tasks.map((t) => ({
      title: t.title,
      details: t.details,
      completed: t.completed,
      completedAt: t.completedAt ? t.completedAt.toISOString() : null,
    }));
    const reflection = {
      good: week.reflection?.good ?? "",
      bad: week.reflection?.bad ?? "",
      consult: week.reflection?.consult ?? "",
    };
    const history = await loadHistory(user.id, {
      isoYear: week.isoYear,
      isoWeek: week.isoWeek,
    });

    const payload =
      kind === "progress"
        ? buildProgressPrompt({
            userLabel,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
            tasks,
            reflection,
            history,
          })
        : buildGoalSettingPrompt({
            userLabel,
            isoYear: week.isoYear,
            isoWeek: week.isoWeek,
            tasks,
            history,
          });

    const { content, model } = await callLLM(payload);
    await prisma.feedback.create({
      data: {
        weekId,
        kind,
        prompt: `SYSTEM:\n${payload.system}\n\nUSER:\n${payload.prompt}`,
        content,
        model,
      },
    });
    revalidatePath(`/weeks/${week.isoYear}/${week.isoWeek}`);
    return { ok: true, content };
  } catch (err) {
    return { ok: false, error: (err as Error).message ?? "unknown error" };
  }
}

export async function deleteFeedback(feedbackId: string) {
  const user = await requireUser();
  const fb = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    include: { week: true },
  });
  if (!fb || fb.week.userId !== user.id) return;
  await prisma.feedback.delete({ where: { id: feedbackId } });
  revalidatePath(`/weeks/${fb.week.isoYear}/${fb.week.isoWeek}`);
}
