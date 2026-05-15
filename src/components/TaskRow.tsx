"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import MarkdownEditor from "./MarkdownEditor";
import { assignTaskToWeek, deleteTask, updateTask } from "@/lib/actions/tasks";

type Props = {
  task: {
    id: string;
    title: string;
    details: string;
    completed: boolean;
    completedAt: string | null;
    week: { isoYear: number; isoWeek: number } | null;
  };
  context: "dashboard" | "week";
  currentWeekId?: string;
  weekOptions?: { id: string; label: string }[];
};

function formatCompletedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export default function TaskRow({ task, context, currentWeekId, weekOptions }: Props) {
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details);
  const [completed, setCompleted] = useState(task.completed);
  const [completedAt, setCompletedAt] = useState(task.completedAt);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function flash() {
    setSavedAt(new Date().toLocaleTimeString());
    setTimeout(() => setSavedAt(null), 1500);
  }

  function toggle() {
    const next = !completed;
    setCompleted(next);
    setCompletedAt(next ? (completedAt ?? new Date().toISOString()) : null);
    startTransition(async () => {
      await updateTask({ taskId: task.id, completed: next });
      flash();
    });
  }

  function commitTitle() {
    if (title === task.title) return;
    startTransition(async () => {
      await updateTask({ taskId: task.id, title });
      flash();
    });
  }

  function commitDetails() {
    if (details === task.details) return;
    startTransition(async () => {
      await updateTask({ taskId: task.id, details });
      flash();
    });
  }

  function onDelete() {
    if (!confirm(`タスク「${task.title}」を削除しますか？`)) return;
    startTransition(async () => {
      await deleteTask(task.id);
    });
  }

  function onAssign(newWeekId: string) {
    startTransition(async () => {
      await assignTaskToWeek({
        taskId: task.id,
        weekId: newWeekId === "__pool__" ? null : newWeekId,
      });
    });
  }

  function onUnassign() {
    startTransition(async () => {
      await assignTaskToWeek({ taskId: task.id, weekId: null });
    });
  }

  return (
    <li className="rounded-md border border-slate-200 bg-white">
      <div className="flex items-center gap-3 px-3 py-2">
        <input type="checkbox" checked={completed} onChange={toggle} className="h-4 w-4" />
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          className={`flex-1 bg-transparent text-sm outline-none ${
            completed ? "text-slate-400 line-through" : ""
          }`}
        />
        {completed && completedAt && (
          <span
            className="text-xs text-emerald-700"
            title={`完了: ${new Date(completedAt).toLocaleString()}`}
          >
            ✓ {formatCompletedAt(completedAt)}
          </span>
        )}
        {context === "dashboard" && (
          <>
            {task.week ? (
              <Link
                href={`/weeks/${task.week.isoYear}/${task.week.isoWeek}`}
                className="rounded-md bg-slate-100 px-2 py-0.5 text-xs no-underline text-slate-700"
              >
                {task.week.isoYear}-W{String(task.week.isoWeek).padStart(2, "0")}
              </Link>
            ) : (
              <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                プール
              </span>
            )}
            {weekOptions && weekOptions.length > 0 && (
              <select
                value={task.week ? "" : "__pool__"}
                onChange={(e) => {
                  if (e.target.value) onAssign(e.target.value);
                }}
                className="rounded-md border border-slate-300 px-1 py-0.5 text-xs"
              >
                <option value="">移動…</option>
                <option value="__pool__">プールへ</option>
                {weekOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    → {w.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        {context === "week" && currentWeekId === undefined && null}
        {context === "week" && (
          <button
            type="button"
            onClick={onUnassign}
            title="プールに戻す"
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            プールへ
          </button>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          {open ? "▲" : "▼"} 詳細
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="text-xs text-red-600 hover:text-red-800"
        >
          削除
        </button>
        {savedAt && <span className="text-xs text-emerald-600">保存 {savedAt}</span>}
      </div>
      {open && (
        <div className="border-t border-slate-200 p-3">
          <MarkdownEditor
            value={details}
            onChange={setDetails}
            height={200}
            placeholder="進め方、参考リンク、メモなど（Markdown 可）"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={commitDetails}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-700"
            >
              詳細を保存
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
