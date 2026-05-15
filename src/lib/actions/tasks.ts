"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { isoWeekLabel, type IsoWeek } from "@/lib/week";

async function loadOwnedWeek(weekId: string) {
  const user = await requireUser();
  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week || week.userId !== user.id) {
    throw new Error("Not found");
  }
  return { user, week };
}

function weekPath(w: Pick<IsoWeek, "isoYear" | "isoWeek">) {
  return `/weeks/${w.isoYear}/${w.isoWeek}`;
}

const createSchema = z.object({
  weekId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
});

export async function createTask(input: { weekId: string; title: string }) {
  const { weekId, title } = createSchema.parse(input);
  const { week } = await loadOwnedWeek(weekId);
  const last = await prisma.task.findFirst({
    where: { weekId },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;
  await prisma.task.create({ data: { weekId, title, order } });
  revalidatePath(weekPath(week));
}

const updateSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  details: z.string().max(20000).optional(),
  completed: z.boolean().optional(),
});

export async function updateTask(input: {
  taskId: string;
  title?: string;
  details?: string;
  completed?: boolean;
}) {
  const data = updateSchema.parse(input);
  const task = await prisma.task.findUnique({ where: { id: data.taskId } });
  if (!task) throw new Error("Not found");
  const { week } = await loadOwnedWeek(task.weekId);
  await prisma.task.update({
    where: { id: data.taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...(data.completed !== undefined ? { completed: data.completed } : {}),
    },
  });
  revalidatePath(weekPath(week));
}

export async function deleteTask(taskId: string) {
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) return;
  const { week } = await loadOwnedWeek(task.weekId);
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath(weekPath(week));
}

const reflectionSchema = z.object({
  weekId: z.string().min(1),
  good: z.string().max(20000).optional(),
  bad: z.string().max(20000).optional(),
  consult: z.string().max(20000).optional(),
});

export async function updateReflection(input: {
  weekId: string;
  good?: string;
  bad?: string;
  consult?: string;
}) {
  const data = reflectionSchema.parse(input);
  const { week } = await loadOwnedWeek(data.weekId);
  await prisma.reflection.upsert({
    where: { weekId: data.weekId },
    update: {
      ...(data.good !== undefined ? { good: data.good } : {}),
      ...(data.bad !== undefined ? { bad: data.bad } : {}),
      ...(data.consult !== undefined ? { consult: data.consult } : {}),
    },
    create: {
      weekId: data.weekId,
      good: data.good ?? "",
      bad: data.bad ?? "",
      consult: data.consult ?? "",
    },
  });
  revalidatePath(weekPath(week));
}

export async function ensureWeekLabel(label: string) {
  return label === isoWeekLabel({ isoYear: 0, isoWeek: 0 });
}
