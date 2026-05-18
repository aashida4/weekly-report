type TaskLite = {
  title: string;
  details: string;
  completed: boolean;
  completedAt?: string | null;
};
type ReflectionLite = { good: string; bad: string; consult: string };

export type WeekContext = {
  isoYear: number;
  isoWeek: number;
  tasks: TaskLite[];
  reflection: ReflectionLite;
  previousProgressAdvice?: string | null;
  previousGoalSettingAdvice?: string | null;
};

export const SYSTEM_ROLE =
  "あなたは研究室に配属された学部生の継続的なメンターです。学習者の過去数週の状況と、自分が前回までに行った助言を踏まえて、一貫性のある温かく具体的なアドバイスを日本語で行ってください。同じ助言を機械的に繰り返さず、前回からの変化に触れてください。";

function fmtTasks(tasks: TaskLite[]): string {
  if (tasks.length === 0) return "（タスク未設定）";
  return tasks
    .map((t, i) => {
      const detail = t.details.trim().slice(0, 280);
      const status = t.completed ? "[x]" : "[ ]";
      const doneAt =
        t.completed && t.completedAt
          ? ` (完了: ${new Date(t.completedAt).toISOString().slice(0, 16).replace("T", " ")})`
          : "";
      return `${i + 1}. ${status} ${t.title}${doneAt}${
        detail ? `\n   詳細: ${detail.replace(/\n/g, " ")}` : ""
      }`;
    })
    .join("\n");
}

function fmtTasksCompact(tasks: TaskLite[]): string {
  if (tasks.length === 0) return "  （タスクなし）";
  return tasks
    .map((t, i) => {
      const status = t.completed ? "[x]" : "[ ]";
      const detail = t.details.trim().slice(0, 100).replace(/\n/g, " ");
      return `  ${i + 1}. ${status} ${t.title}${detail ? ` — ${detail}` : ""}`;
    })
    .join("\n");
}

function fmtReflection(r: ReflectionLite): string {
  return `# 振り返り\n- よかったこと: ${r.good || "（未記入）"}\n- わるかったこと: ${r.bad || "（未記入）"}\n- 相談したいこと: ${r.consult || "（未記入）"}`;
}

function compactReflection(r: ReflectionLite): string {
  const g = (r.good || "（未記入）").replace(/\n/g, " ").slice(0, 160);
  const b = (r.bad || "（未記入）").replace(/\n/g, " ").slice(0, 160);
  const c = (r.consult || "（未記入）").replace(/\n/g, " ").slice(0, 160);
  return `  - 振り返り: よかった=${g} / わるかった=${b} / 相談=${c}`;
}

function quote(text: string, maxLen = 600): string {
  const clipped = text.trim().slice(0, maxLen);
  return clipped
    .split(/\n+/)
    .map((line) => `    > ${line}`)
    .join("\n");
}

function fmtHistory(history: WeekContext[]): string {
  if (history.length === 0) return "（履歴なし — このユーザーにとって今週が初回です）";
  return history
    .map((h) => {
      const done = h.tasks.filter((t) => t.completed).length;
      const total = h.tasks.length;
      const rate = total === 0 ? 0 : Math.round((done / total) * 100);
      const parts: string[] = [];
      parts.push(
        `## ${h.isoYear}-W${String(h.isoWeek).padStart(2, "0")} (${done}/${total} 完了, ${rate}%)`,
      );
      parts.push("- タスク:");
      parts.push(fmtTasksCompact(h.tasks));
      parts.push(compactReflection(h.reflection));
      if (h.previousGoalSettingAdvice?.trim()) {
        parts.push("  - この週の冒頭、私（メンター）が行った「目標設定」助言（抜粋）:");
        parts.push(quote(h.previousGoalSettingAdvice));
      }
      if (h.previousProgressAdvice?.trim()) {
        parts.push("  - この週の終盤、私（メンター）が行った「目標遂行」助言（抜粋）:");
        parts.push(quote(h.previousProgressAdvice));
      }
      return parts.join("\n");
    })
    .join("\n\n");
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
  history: WeekContext[];
}): { system: string; prompt: string } {
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const rate = total === 0 ? 0 : Math.round((done / total) * 100);
  const prompt = `学習者: ${userLabel}
対象週: ${isoYear}-W${String(isoWeek).padStart(2, "0")}
完了率: ${done}/${total} (${rate}%)

# これまでの経緯（直近${history.length}週: 古い→新しい）
${fmtHistory(history)}

# 今週のタスク
${fmtTasks(tasks)}

${fmtReflection(reflection)}

# 依頼
1) **前回までに自分（メンター）が行った助言が今週の達成にどう活きたか／活かしきれなかったか**に触れた上で、今週の達成状況を3〜4行で要約してください。
2) 過去数週の傾向（例: やり残しが続いている、特定のタスク種別が滞る、振り返りで同じ悩みが繰り返される 等）を踏まえた、次週への具体的アドバイスを3点（行動レベル、箇条書き）。
3) 最後に1〜2文の励ましを添えてください。
出力はMarkdownで、見出し（##）を使ってセクションを区切ってください。
注意: 履歴がない場合（初回）はその旨を踏まえ、無理に過去に言及しないでください。`;
  return { system: SYSTEM_ROLE, prompt };
}

export function buildGoalSettingPrompt({
  userLabel,
  isoYear,
  isoWeek,
  tasks,
  history,
}: {
  userLabel: string;
  isoYear: number;
  isoWeek: number;
  tasks: TaskLite[];
  history: WeekContext[];
}): { system: string; prompt: string } {
  const prompt = `学習者: ${userLabel}
対象週: ${isoYear}-W${String(isoWeek).padStart(2, "0")}

# これまでの経緯（直近${history.length}週: 古い→新しい）
${fmtHistory(history)}

# 学習者が今週設定したタスク
${fmtTasks(tasks)}

# 依頼
このタスクリストを SMART 基準（Specific / Measurable / Achievable / Relevant / Time-bound）で評価してください。
1) 各タスクごとに「良い点」と「改善点」を簡潔に指摘してください。**前回までに自分（メンター）がした目標設定改善案が今週の目標に反映されているかにも言及**。
2) 改善案（書き換え例）を1〜2件提示してください。
3) 全体としてタスクの粒度・量・優先順位が1週間として適切かをコメントしてください。**過去週の達成パターン（消化率、特定種別の積み残し 等）と比べて多すぎ/少なすぎがあれば指摘**。
出力はMarkdownで、見出し（##）を使ってセクションを区切ってください。
注意: 履歴がない場合（初回）はその旨を踏まえ、無理に過去に言及しないでください。`;
  return { system: SYSTEM_ROLE, prompt };
}
