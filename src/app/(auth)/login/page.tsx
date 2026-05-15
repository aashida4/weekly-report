import { signIn } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/dashboard";
  const error = sp.error;

  async function loginAction(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const nextPath = String(formData.get("next") ?? "/dashboard");
    try {
      await signIn("credentials", { email, password, redirectTo: nextPath });
    } catch (err) {
      const msg = (err as Error)?.message ?? "";
      if (msg.includes("NEXT_REDIRECT")) throw err;
      redirect(`/login?error=invalid&next=${encodeURIComponent(nextPath)}`);
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Login</h1>
      {error === "stale" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          セッションが無効になりました（ユーザーが見つかりません）。再度ログインしてください。
        </p>
      )}
      {error && error !== "stale" && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          メールアドレスまたはパスワードが違います。
        </p>
      )}
      <form action={loginAction} className="mt-6 space-y-4">
        <input type="hidden" name="next" value={next} />
        <div>
          <label className="block text-sm text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-brand py-2 text-white hover:bg-brand-dark"
        >
          Sign in
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        アカウント未作成の方は <Link href="/signup">Sign up</Link>
      </p>
    </div>
  );
}
