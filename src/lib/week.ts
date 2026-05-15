import {
  getISOWeek,
  getISOWeekYear,
  setISOWeek,
  setISOWeekYear,
  startOfISOWeek,
  endOfISOWeek,
  addWeeks,
  subWeeks,
  format,
} from "date-fns";
import { prisma } from "./db";

export type IsoWeek = { isoYear: number; isoWeek: number };

export function currentIsoWeek(now: Date = new Date()): IsoWeek {
  return { isoYear: getISOWeekYear(now), isoWeek: getISOWeek(now) };
}

export function isoWeekToRange({ isoYear, isoWeek }: IsoWeek): { start: Date; end: Date } {
  const base = setISOWeek(setISOWeekYear(new Date(), isoYear), isoWeek);
  return { start: startOfISOWeek(base), end: endOfISOWeek(base) };
}

export function formatIsoWeekRange(w: IsoWeek): string {
  const { start, end } = isoWeekToRange(w);
  return `${format(start, "yyyy/MM/dd")} – ${format(end, "MM/dd")}`;
}

export function isoWeekLabel(w: IsoWeek): string {
  return `${w.isoYear}-W${String(w.isoWeek).padStart(2, "0")}`;
}

export function parseIsoWeekLabel(label: string): IsoWeek | null {
  const m = label.match(/^(\d{4})-W(\d{1,2})$/i);
  if (!m) return null;
  const isoYear = Number(m[1]);
  const isoWeek = Number(m[2]);
  if (isoWeek < 1 || isoWeek > 53) return null;
  return { isoYear, isoWeek };
}

export function shiftIsoWeek(w: IsoWeek, by: number): IsoWeek {
  const { start } = isoWeekToRange(w);
  const shifted = by >= 0 ? addWeeks(start, by) : subWeeks(start, -by);
  return { isoYear: getISOWeekYear(shifted), isoWeek: getISOWeek(shifted) };
}

export async function getOrCreateWeek(userId: string, w: IsoWeek) {
  const existing = await prisma.week.findUnique({
    where: { userId_isoYear_isoWeek: { userId, isoYear: w.isoYear, isoWeek: w.isoWeek } },
  });
  if (existing) return existing;
  return prisma.week.create({
    data: {
      userId,
      isoYear: w.isoYear,
      isoWeek: w.isoWeek,
      reflection: { create: {} },
    },
  });
}
