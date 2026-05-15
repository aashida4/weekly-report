type TaskLite = { title: string; details: string; completed: boolean };
type ReflectionLite = { good: string; bad: string; consult: string };
type WeekSummary = { isoYear: number; isoWeek: number; total: number; done: number };

export const SYSTEM_ROLE =
  "あなたは研究を志す大学院生のメンターです。目標設定能力を養い、モチベーションを高め、研究遂行能力を引き上げるための、温かく具体的なアドバイスを日本語で行ってください。";

function fmtTasks(tasks: TaskLite[]): string {
  if (tasks.length === 0) return "（タスク未設定）";
  return tasks
    .map((t, i) => {
      const detail = t.details.trim().slice(0, 280);
      const status = t.completed ? "[x]" : "[ ]";
      return `${i + 1}. ${status} ${t.title}${detail ? `\n   詳細: ${detail.replace(/\n/g, " ")}` : ""}`;
    })
    .join("\n");
}

function fmtReflection(r: ReflectionLite): string {
  return `# 振り返り\n- よかったこと: ${r.good || "（未記入）"}\n- わるかったこと: ${r.bad || "（未記入）"}\n- 相談したいこと: ${r.consult || "（未記入）"}`;
}

function fmtHistory(history: WeekSummary[]): string {
  if (history.length === 0) return "（履歴なし）";
  return history
    .map(
      (h) =>
        `- ${h.isoYear}-W${String(h.isoWeek).padStart(2, "0")}: ${h.done}/${h.total} 完了 (${
          h.total === 0 ? 0 : Math.round((h.done / h.total) * 100)
        }%)`,
    )
    .join("\n");
}

export function buildProgressPrompt({
  userLabel,
  isoYear,
  isoWeek,
  tasks,
  reflection,
  history,
}: {
  userLabel: string;
  isoYear: number;
  isoWeek: number;
  tasks: TaskLite[];
  reflection: ReflectionLite;
  history: WeekSummary[];
}): { system: string; prompt: string } {
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  const prompt = `学習者: ${userLabel}
対象週: ${isoYear}-W${String(isoWeek).padStart(2, "0")}
完了率: ${done}/${total} (${rate}%)

# 今週のタスク
${fmtTasks(tasks)}

${fmtReflection(reflection)}

# 過去の進捗（最大4週）
${fmtHistory(history)}

# 依頼
1) 今週の達成状況を3〜4行で要約してください。
2) 次週に向けた具体的アドバイスを3点、箇条書きで（行動レベル）。
3) 最後に1〜2文の励ましを添えてください。
出力はMarkdownで、見出し（##）を使ってセクションを区切ってください。`;
  return { system: SYSTEM_ROLE, prompt };
}

export function buildGoalSettingPrompt({
  userLabel,
  isoYear,
  isoWeek,
  tasks,
}: {
  userLabel: string;
  isoYear: number;
  isoWeek: number;
  tasks: TaskLite[];
}): { system: string; prompt: string } {
  const prompt = `学習者: ${userLabel}
対象週: ${isoYear}-W${String(isoWeek).padStart(2, "0")}

# 学習者が設定した今週のタスク
${fmtTasks(tasks)}

# 依頼
このタスクリストを SMART 基準（Specific / Measurable / Achievable / Relevant / Time-bound）で評価してください。
1) 各タスクごとに「良い点」と「改善点」を簡潔に指摘してください。
2) 改善案（書き換え例）を1〜2件提示してください。
3) 全体としてタスクの粒度・量・優先順位が1週間として適切かをコメントしてください。
出力はMarkdownで、見出し（##）を使ってセクションを区切ってください。`;
  return { system: SYSTEM_ROLE, prompt };
}
