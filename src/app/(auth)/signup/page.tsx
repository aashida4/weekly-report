import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { signIn } from "@/lib/auth";

const allowSignup = process.env.ALLOW_SIGNUP !== "false";

const schema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(80),
  password: z.string().min(8).max(200),
});

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  if (!allowSignup) {
    return (
      <div className="mx-auto max-w-sm">
        <h1 className="text-2xl font-semibold">Sign up disabled</h1>
        <p className="mt-3 text-slate-700">
          現在新規登録は無効化されています。管理者にアカウント発行を依頼してください。
        </p>
      </div>
    );
  }

  async function signupAction(formData: FormData) {
    "use server";
    const parsed = schema.safeParse({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });
    if (!parsed.success) redirect("/signup?error=invalid");
    const { email, name, password } = parsed.data;
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) redirect("/signup?error=duplicate");
    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { email, name, passwordHash, role: "student" },
    });
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
  }

  const errorMessage =
    error === "duplicate"
      ? "このメールアドレスは既に登録されています。"
      : error === "invalid"
        ? "入力に誤りがあります（パスワードは8文字以上）。"
        : null;

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-semibold">Sign up</h1>
      {errorMessage && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errorMessage}</p>
      )}
      <form action={signupAction} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm text-slate-700">Name</label>
          <input
            type="text"
            name="name"
            required
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
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
          <label className="block text-sm text-slate-700">Password (8文字以上)</label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-brand py-2 text-white hover:bg-brand-dark"
        >
          Create account
        </button>
      </form>
      <p className="mt-4 text-sm text-slate-600">
        すでにアカウントをお持ちですか？ <Link href="/login">Login</Link>
      </p>
    </div>
  );
}
