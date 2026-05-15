"use client";

import { useState, useTransition } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { updateTask, deleteTask } from "@/lib/actions/tasks";

type Props = {
  task: {
    id: string;
    title: string;
    details: string;
    completed: boolean;
  };
};

export default function TaskRow({ task }: Props) {
  const [title, setTitle] = useState(task.title);
  const [details, setDetails] = useState(task.details);
  const [completed, setCompleted] = useState(task.completed);
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
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-xs text-slate-600 hover:text-slate-900"
        >
          {open ? "▲ 閉じる" : "▼ 詳細"}
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
