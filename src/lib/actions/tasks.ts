"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

function weekPath(w: { isoYear: number; isoWeek: number }) {
  return `/weeks/${w.isoYear}/${w.isoWeek}`;
}

async function loadOwnedTask(taskId: string) {
  const user = await requireUser();
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { week: true },
  });
  if (!task || task.userId !== user.id) throw new Error("Not found");
  return { user, task };
}

async function loadOwnedWeek(weekId: string) {
  const user = await requireUser();
  const week = await prisma.week.findUnique({ where: { id: weekId } });
  if (!week || week.userId !== user.id) throw new Error("Not found");
  return { user, week };
}

function revalidateForTask(task: { week: { isoYear: number; isoWeek: number } | null }) {
  revalidatePath("/dashboard");
  if (task.week) revalidatePath(weekPath(task.week));
}

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  weekId: z.string().min(1).nullable().optional(),
});

export async function createTask(input: { title: string; weekId?: string | null }) {
  const { title, weekId } = createSchema.parse(input);
  const user = await requireUser();
  if (weekId) {
    await loadOwnedWeek(weekId);
  }
  const last = await prisma.task.findFirst({
    where: { userId: user.id, weekId: weekId ?? null },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;
  const created = await prisma.task.create({
    data: {
      userId: user.id,
      weekId: weekId ?? null,
      title,
      order,
    },
    include: { week: true },
  });
  revalidateForTask(created);
}

const updateSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1).max(200).optional(),
  details: z.string().max(20000).optional(),
  completed: z.boolean().optional(),
  archived: z.boolean().optional(),
});

export async function updateTask(input: {
  taskId: string;
  title?: string;
  details?: string;
  completed?: boolean;
  archived?: boolean;
}) {
  const data = updateSchema.parse(input);
  const { task } = await loadOwnedTask(data.taskId);
  const completedPatch =
    data.completed === undefined
      ? {}
      : data.completed
        ? { completed: true, completedAt: task.completedAt ?? new Date() }
        : { completed: false, completedAt: null };
  const updated = await prisma.task.update({
    where: { id: data.taskId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.details !== undefined ? { details: data.details } : {}),
      ...completedPatch,
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
    },
    include: { week: true },
  });
  revalidateForTask(updated);
  // also revalidate previous week if it was different (unlikely here)
  if (task.week && task.week.id !== updated.week?.id) {
    revalidatePath(weekPath(task.week));
  }
}

export async function deleteTask(taskId: string) {
  const { task } = await loadOwnedTask(taskId);
  await prisma.task.delete({ where: { id: taskId } });
  revalidatePath("/dashboard");
  if (task.week) revalidatePath(weekPath(task.week));
}

const assignSchema = z.object({
  taskId: z.string().min(1),
  weekId: z.string().min(1).nullable(),
});

export async function assignTaskToWeek(input: { taskId: string; weekId: string | null }) {
  const { taskId, weekId } = assignSchema.parse(input);
  const { task } = await loadOwnedTask(taskId);
  if (weekId) await loadOwnedWeek(weekId);
  const last = await prisma.task.findFirst({
    where: { userId: task.userId, weekId: weekId ?? null },
    orderBy: { order: "desc" },
  });
  const order = (last?.order ?? -1) + 1;
  const updated = await prisma.task.update({
    where: { id: taskId },
    data: { weekId, order },
    include: { week: true },
  });
  revalidatePath("/dashboard");
  if (task.week) revalidatePath(weekPath(task.week));
  if (updated.week) revalidatePath(weekPath(updated.week));
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
