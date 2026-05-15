"use client";

import dynamic from "next/dynamic";
import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type Props = {
  value: string;
  onChange: (value: string) => void;
  height?: number;
  placeholder?: string;
};

export default function MarkdownEditor({ value, onChange, height = 220, placeholder }: Props) {
  return (
    <div data-color-mode="light">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v ?? "")}
        height={height}
        preview="edit"
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
