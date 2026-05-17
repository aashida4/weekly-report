import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthed = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isLoginPage = pathname === "/login";
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/weeks") ||
        pathname.startsWith("/admin");
      if (isProtected && !isAuthed) {
        const url = new URL("/login", nextUrl);
        url.searchParams.set("next", pathname);
        return Response.redirect(url);
      }
      // Only bounce authed users away from /login (not /signup) — and not when
      // ?error= is set, since a stale JWT user needs to actually re-login.
      // /signup is always reachable so a stale-cookie user can create an account.
      if (isLoginPage && isAuthed && !nextUrl.searchParams.has("error")) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as { id?: string }).id ?? token.sub;
        token.role = (user as { role?: string }).role ?? "student";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.id as string) ?? token.sub ?? "";
        session.user.role = (token.role as "student" | "admin") ?? "student";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
