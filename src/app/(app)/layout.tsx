import Link from "next/link";
import { auth, signOut } from "@/lib/auth";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;
  const isAdmin = (user as { role?: string } | undefined)?.role === "admin";

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/" className="text-lg font-semibold text-slate-900 no-underline">
            Weekly Report
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            {user ? (
              <>
                <Link href="/dashboard">Dashboard</Link>
                <Link href="/weeks">Weeks</Link>
                {isAdmin && <Link href="/admin">Admin</Link>}
                <span className="text-slate-500">{user.email}</span>
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/login" });
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1 text-slate-700 hover:bg-slate-100"
                  >
                    Logout
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login">Login</Link>
                <Link href="/signup">Sign up</Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
