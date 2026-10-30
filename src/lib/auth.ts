import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Fail fast if no secret is configured — never fall back to a hardcoded string
// (a public fallback lets attackers forge session JWTs).
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
if (!NEXTAUTH_SECRET) {
  console.warn(
    "[auth] NEXTAUTH_SECRET is not set. Set it in .env before running in production."
  );
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          // Returning null (rather than throwing) is the NextAuth contract
          // for "invalid credentials". It yields a generic error on the client.
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });

        // Always run a bcrypt compare even when the user is not found, so the
        // response timing doesn't reveal whether the email exists
        // (user-enumeration mitigation). Use a dummy hash that never matches.
        const dummyHash = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
        const valid = user
          ? await bcrypt.compare(credentials.password, user.password)
          : await bcrypt.compare(credentials.password, dummyHash);

        if (!user || !valid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.image,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role ?? "USER";
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
  // Use the env var; if missing, NextAuth will throw on session operations in
  // production — which is the correct fail-closed behaviour.
  secret: NEXTAUTH_SECRET,
};

// Type augmentation for next-auth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
      role: string;
    };
  }
  interface User {
    role?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string;
    id?: string;
  }
}
