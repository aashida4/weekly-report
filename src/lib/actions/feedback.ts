"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { callOllama } from "@/lib/ollama";
import { buildGoalSettingPrompt, buildProgressPrompt } from "@/lib/prompts";
import { shiftIsoWeek } from "@/lib/week";

type Kind = "progress" | "goal_setting";

async function loadWeekForUser(weekId: string) {
  const user = await requireUser();
  const week = await prisma.week.findUnique({
    where: { id: weekId },
    include: { tasks: { orderBy: { order: "asc" } }, reflection: true },
  });
  if (!week || week.userId !== user.id) throw new Error("Not found");
  return { user, week };
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

    let payload: { system: string; prompt: string };
    if (kind === "progress") {
      const history: { isoYear: number; isoWeek: number; total: number; done: number }[] = [];
      for (let i = 1; i <= 4; i++) {
        const shifted = shiftIsoWeek({ isoYear: week.isoYear, isoWeek: week.isoWeek }, -i);
        const prev = await prisma.week.findUnique({
          where: {
            userId_isoYear_isoWeek: {
              userId: user.id,
              isoYear: shifted.isoYear,
              isoWeek: shifted.isoWeek,
            },
          },
          include: { tasks: true },
        });
        if (prev) {
          history.push({
            isoYear: prev.isoYear,
            isoWeek: prev.isoWeek,
            total: prev.tasks.length,
            done: prev.tasks.filter((t) => t.completed).length,
          });
        }
      }
      payload = buildProgressPrompt({
        userLabel,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        tasks,
        reflection,
        history,
      });
    } else {
      payload = buildGoalSettingPrompt({
        userLabel,
        isoYear: week.isoYear,
        isoWeek: week.isoWeek,
        tasks,
      });
    }

    const { content, model } = await callOllama(payload);
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
