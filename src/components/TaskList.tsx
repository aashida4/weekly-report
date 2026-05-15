"use client";

import { useRef, useState, useTransition } from "react";
import { createTask } from "@/lib/actions/tasks";
import TaskRow from "./TaskRow";

type Task = {
  id: string;
  title: string;
  details: string;
  completed: boolean;
};

export default function TaskList({ weekId, tasks }: { weekId: string; tasks: Task[] }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState("");

  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const t = title;
    setTitle("");
    startTransition(async () => {
      await createTask({ weekId, title: t });
      inputRef.current?.focus();
    });
  }

  return (
    <div>
      <form onSubmit={add} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="今週やるタスクを入力して Enter"
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-brand px-3 py-2 text-sm text-white hover:bg-brand-dark"
        >
          追加
        </button>
      </form>
      <ul className="mt-4 space-y-2">
        {tasks.length === 0 && (
          <li className="rounded-md border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            まだタスクがありません。上の入力欄から追加してください。
          </li>
        )}
        {tasks.map((t) => (
          <TaskRow key={t.id} task={t} />
        ))}
      </ul>
    </div>
  );
}
