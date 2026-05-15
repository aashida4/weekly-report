"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MarkdownView({ children }: { children: string }) {
  if (!children?.trim()) {
    return <p className="text-sm text-slate-400">（未入力）</p>;
  }
  return (
    <div className="prose prose-slate max-w-none prose-pre:bg-slate-900 prose-pre:text-slate-100">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
