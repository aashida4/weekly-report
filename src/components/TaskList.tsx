"use client";

import { useRef, useState, useTransition } from "react";
import { assignTaskToWeek, createTask } from "@/lib/actions/tasks";
import TaskRow from "./TaskRow";

type Task = {
  id: string;
  title: string;
  details: string;
  completed: boolean;
  completedAt: string | null;
  week: { isoYear: number; isoWeek: number } | null;
};

type Props = {
  context: "dashboard" | "week";
  tasks: Task[];
  /** dashboard: 追加時に既定で割り当てる週 (null = プール). week: 該当週ID */
  defaultWeekId?: string | null;
  /** dashboard: TaskRow 内の「移動…」セレクト用 */
  weekOptions?: { id: string; label: string }[];
  /** week: 該当週ID（プールタスク表示用） */
  weekId?: string;
  /** week: 「プールから選択」可能なタスク一覧 */
  poolTasks?: { id: string; title: string }[];
};

export default function TaskList({
  context,
  tasks,
  defaultWeekId = null,
  weekOptions,
  weekId,
  poolTasks,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [pick, setPick] = useState("");

  const placeholder =
    context === "week"
      ? "今週のタスクを入力して Enter（または右でプールから選択）"
      : "タスクを入力して Enter (プールに追加されます)";

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const t = title;
    setTitle("");
    startTransition(async () => {
      await createTask({ title: t, weekId: defaultWeekId ?? null });
      inputRef.current?.focus();
    });
  }

  function pickFromPool(e: React.FormEvent) {
    e.preventDefault();
    if (!pick || !weekId) return;
    const id = pick;
    setPick("");
    startTransition(async () => {
      await assignTaskToWeek({ taskId: id, weekId });
    });
  }

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <form onSubmit={add} className="flex flex-1 gap-2">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={placeholder}
            className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-md bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark"
          >
            追加
          </button>
        </form>
        {context === "week" && poolTasks && poolTasks.length > 0 && (
          <form onSubmit={pickFromPool} className="flex gap-2">
            <select
              value={pick}
              onChange={(e) => setPick(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">プールから選択…</option>
              {poolTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!pick}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              今週に追加
            </button>
          </form>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {tasks.length === 0 && (
          <li className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            {context === "week"
              ? "今週のタスクがありません。上で追加するか、プールから選んでください。"
              : "タスクがありません。上の入力欄から追加してください。"}
          </li>
        )}
        {tasks.map((t) => (
          <TaskRow
            key={t.id}
            task={t}
            context={context}
            currentWeekId={weekId}
            weekOptions={weekOptions}
          />
        ))}
      </ul>
    </div>
  );
}
