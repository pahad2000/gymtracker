import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { sendVerificationEmail, generateVerificationCode } from "./email";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        twoFactorCode: { label: "2FA Code", type: "text", optional: true },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!passwordMatch) {
          return null;
        }

        // Check if 2FA is enabled
        if (user.twoFactorEnabled) {
          const twoFactorCode = credentials.twoFactorCode as string | undefined;

          if (!twoFactorCode) {
            // Generate and send 2FA code
            const code = generateVerificationCode();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            await prisma.user.update({
              where: { id: user.id },
              data: {
                twoFactorCode: code,
                twoFactorExpires: expiresAt,
              },
            });

            await sendVerificationEmail(user.email, code);

            // Return a special error to indicate 2FA is needed
            throw new Error("2FA_REQUIRED");
          }

          // Verify 2FA code
          if (!user.twoFactorCode || !user.twoFactorExpires) {
            throw new Error("No verification code found");
          }

          if (new Date() > user.twoFactorExpires) {
            throw new Error("Verification code expired");
          }

          if (user.twoFactorCode !== twoFactorCode) {
            throw new Error("Invalid verification code");
          }

          // Clear 2FA code after successful verification
          await prisma.user.update({
            where: { id: user.id },
            data: {
              twoFactorCode: null,
              twoFactorExpires: null,
            },
          });
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
});
