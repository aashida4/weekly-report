import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";
import { authConfig } from "./auth.config";
import { prisma } from "./db";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "student" | "admin";
    } & DefaultSession["user"];
  }
  interface User {
    role?: "student" | "admin";
  }
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role as "student" | "admin",
        };
      },
    }),
  ],
});

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!dbUser) {
    // Stale JWT (user was deleted or DB was reset). Clear cookie and force re-login.
    await signOut({ redirect: false }).catch(() => undefined);
    redirect("/login?error=stale");
  }
  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? undefined,
    role: dbUser.role as "student" | "admin",
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

export function isAdmin(user: { role?: string } | null | undefined): boolean {
  return user?.role === "admin";
}
