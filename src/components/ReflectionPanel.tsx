"use client";

import { useState, useTransition } from "react";
import MarkdownEditor from "./MarkdownEditor";
import { updateReflection } from "@/lib/actions/tasks";

type Props = {
  weekId: string;
  initial: { good: string; bad: string; consult: string };
};

const fields: { key: "good" | "bad" | "consult"; label: string; placeholder: string }[] = [
  { key: "good", label: "よかったこと", placeholder: "うまくいったこと、嬉しかったこと" },
  { key: "bad", label: "わるかったこと", placeholder: "詰まったこと、改善したいこと" },
  { key: "consult", label: "誰かに相談したいこと", placeholder: "アドバイザー・同僚に聞きたいこと" },
];

export default function ReflectionPanel({ weekId, initial }: Props) {
  const [state, setState] = useState(initial);
  const [, startTransition] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);

  function save(key: "good" | "bad" | "consult", value: string) {
    setState((s) => ({ ...s, [key]: value }));
    startTransition(async () => {
      await updateReflection({ weekId, [key]: value });
      setSavedAt(new Date().toLocaleTimeString());
      setTimeout(() => setSavedAt(null), 1500);
    });
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {fields.map((f) => (
        <div key={f.key} className="rounded-md border border-slate-200 bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-medium text-slate-800">{f.label}</h3>
            {savedAt && <span className="text-xs text-emerald-600">保存 {savedAt}</span>}
          </div>
          <MarkdownEditor
            value={state[f.key]}
            onChange={(v) => setState((s) => ({ ...s, [f.key]: v }))}
            height={200}
            placeholder={f.placeholder}
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={() => save(f.key, state[f.key])}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white hover:bg-slate-700"
            >
              保存
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
