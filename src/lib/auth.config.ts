import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isAuthed = !!auth?.user;
      const pathname = nextUrl.pathname;
      const isAuthPage = pathname === "/login" || pathname === "/signup";
      const isProtected =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/weeks") ||
        pathname.startsWith("/admin");
      if (isProtected && !isAuthed) {
        const url = new URL("/login", nextUrl);
        url.searchParams.set("next", pathname);
        return Response.redirect(url);
      }
      // Don't bounce an authed user away from /login when an error qualifier
      // is present (e.g. ?error=stale means their JWT references a deleted user
      // — they need to actually re-login).
      if (isAuthPage && isAuthed && !nextUrl.searchParams.has("error")) {
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
