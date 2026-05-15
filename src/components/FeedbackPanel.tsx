"use client";

import { useState, useTransition } from "react";
import MarkdownView from "./MarkdownView";
import { deleteFeedback, generateFeedback } from "@/lib/actions/feedback";

type Feedback = {
  id: string;
  kind: string;
  content: string;
  model: string;
  createdAt: string;
};

type Props = {
  weekId: string;
  feedbacks: Feedback[];
};

const KIND_LABEL: Record<string, string> = {
  progress: "目標遂行アドバイス",
  goal_setting: "目標設定アドバイス",
};

function Section({
  weekId,
  kind,
  items,
}: {
  weekId: string;
  kind: "progress" | "goal_setting";
  items: Feedback[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const latest = items[0];
  const history = items.slice(1);
  const [showHistory, setShowHistory] = useState(false);

  function onGenerate() {
    setError(null);
    startTransition(async () => {
      const r = await generateFeedback({ weekId, kind });
      if (!r.ok) setError(r.error);
    });
  }

  function onDelete(id: string) {
    if (!confirm("このフィードバックを削除しますか？")) return;
    startTransition(async () => {
      await deleteFeedback(id);
    });
  }

  return (
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">{KIND_LABEL[kind]}</h3>
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="rounded-md bg-brand px-3 py-1 text-xs text-white hover:bg-brand-dark disabled:opacity-50"
        >
          {pending ? "生成中…" : "アドバイスを生成"}
        </button>
      </div>
      {error && (
        <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
          生成に失敗しました: {error}
        </p>
      )}
      {latest ? (
        <div>
          <div className="mb-2 text-xs text-slate-500">
            {new Date(latest.createdAt).toLocaleString()} ({latest.model})
            <button
              type="button"
              onClick={() => onDelete(latest.id)}
              className="ml-3 text-red-600 hover:text-red-800"
            >
              削除
            </button>
          </div>
          <MarkdownView>{latest.content}</MarkdownView>
        </div>
      ) : (
        <p className="text-sm text-slate-500">まだフィードバックがありません。</p>
      )}
      {history.length > 0 && (
        <details
          open={showHistory}
          onToggle={(e) => setShowHistory((e.target as HTMLDetailsElement).open)}
          className="mt-4 border-t border-slate-200 pt-3"
        >
          <summary className="cursor-pointer text-sm text-slate-600">
            過去のフィードバック ({history.length})
          </summary>
          <div className="mt-3 space-y-4">
            {history.map((h) => (
              <div key={h.id} className="rounded-md bg-slate-50 p-3">
                <div className="mb-1 text-xs text-slate-500">
                  {new Date(h.createdAt).toLocaleString()} ({h.model})
                  <button
                    type="button"
                    onClick={() => onDelete(h.id)}
                    className="ml-3 text-red-600 hover:text-red-800"
                  >
                    削除
                  </button>
                </div>
                <MarkdownView>{h.content}</MarkdownView>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default function FeedbackPanel({ weekId, feedbacks }: Props) {
  const progress = feedbacks.filter((f) => f.kind === "progress");
  const goal = feedbacks.filter((f) => f.kind === "goal_setting");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section weekId={weekId} kind="goal_setting" items={goal} />
      <Section weekId={weekId} kind="progress" items={progress} />
    </div>
  );
}
