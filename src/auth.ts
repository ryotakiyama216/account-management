import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findStoredUserByEmail, verifyPassword } from "@/lib/users";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  password: string;
};

function parseAuthUsers(): AuthUser[] {
  const raw = process.env.AUTH_USERS_JSON;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as AuthUser[];
    return parsed.filter((u) => u.id && u.email && u.password);
  } catch {
    return [];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login"
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) {
          return null;
        }

        const storedUser = await findStoredUserByEmail(email);
        if (storedUser) {
          const ok = await verifyPassword(password, storedUser.passwordHash);
          if (!ok) {
            return null;
          }
          return {
            id: storedUser.id,
            name: storedUser.name,
            email: storedUser.email
          };
        }

        const envUser = parseAuthUsers().find(
          (u) => u.email === email && u.password === password
        );
        if (!envUser) {
          return null;
        }

        return {
          id: envUser.id,
          name: envUser.name,
          email: envUser.email
        };
      }
    })
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user?.id) {
        token.userId = user.id;
      }
      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    }
  }
});
