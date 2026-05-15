import MarkdownView from "./MarkdownView";

type Task = { id: string; title: string; details: string; completed: boolean };
type Reflection = { good: string; bad: string; consult: string } | null;
type Feedback = {
  id: string;
  kind: string;
  content: string;
  model: string;
  createdAt: string;
};

export default function WeekViewReadOnly({
  tasks,
  reflection,
  feedbacks,
}: {
  tasks: Task[];
  reflection: Reflection;
  feedbacks: Feedback[];
}) {
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-lg font-semibold">今週のタスク</h2>
        {tasks.length === 0 ? (
          <p className="text-sm text-slate-500">タスクなし</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((t) => (
              <li
                key={t.id}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      t.completed ? "bg-emerald-500" : "bg-slate-300"
                    }`}
                  />
                  <span
                    className={`font-medium ${
                      t.completed ? "text-slate-500 line-through" : ""
                    }`}
                  >
                    {t.title}
                  </span>
                </div>
                {t.details && (
                  <div className="mt-2 border-t border-slate-100 pt-2">
                    <MarkdownView>{t.details}</MarkdownView>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">振り返り</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {(["good", "bad", "consult"] as const).map((k) => {
            const label =
              k === "good" ? "よかったこと" : k === "bad" ? "わるかったこと" : "誰かに相談したいこと";
            return (
              <div
                key={k}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <h3 className="mb-2 font-medium text-slate-800">{label}</h3>
                <MarkdownView>{reflection?.[k] ?? ""}</MarkdownView>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">LLM フィードバック</h2>
        {feedbacks.length === 0 ? (
          <p className="text-sm text-slate-500">フィードバックなし</p>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((f) => (
              <div
                key={f.id}
                className="rounded-md border border-slate-200 bg-white p-3"
              >
                <div className="mb-2 text-xs text-slate-500">
                  {f.kind === "progress" ? "目標遂行" : "目標設定"} ·{" "}
                  {new Date(f.createdAt).toLocaleString()} ({f.model})
                </div>
                <MarkdownView>{f.content}</MarkdownView>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
