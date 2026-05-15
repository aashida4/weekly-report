import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }
  return (
    <div className="prose max-w-none">
      <h1 className="text-3xl font-bold">Weekly Report</h1>
      <p className="mt-4 text-slate-700">
        毎週のタスクと振り返りを記録し、Ollama
        ベースのLLMからアドバイスを受けることで、目標設定能力とモチベーションを高めるためのアプリです。
      </p>
      <ul className="mt-6 list-disc space-y-1 pl-6 text-slate-700">
        <li>週ごとのタスク管理（Markdown 詳細、完了フラグ）</li>
        <li>振り返り（よかったこと / わるかったこと / 相談したいこと）</li>
        <li>LLMによる「目標設定」「目標遂行」アドバイス</li>
      </ul>
      <div className="mt-8 flex gap-3">
        <Link
          href="/login"
          className="rounded-md bg-brand px-4 py-2 text-white no-underline hover:bg-brand-dark"
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-slate-300 px-4 py-2 text-slate-700 no-underline hover:bg-slate-100"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
