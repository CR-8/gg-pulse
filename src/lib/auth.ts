import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/modules/auth/auth.config";
import {
  isVerifiedGitHubEmail,
  sessionClaimsFor,
  upsertOAuthUser,
  verifyCredentials,
} from "@/modules/auth/service";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    ...authConfig.providers,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: (raw) => verifyCredentials(raw),
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      if (!account || account.provider === "credentials") return true;
      if (!user.email) return false;
      if (account.provider === "github") {
        if (
          !account.access_token ||
          !(await isVerifiedGitHubEmail(account.access_token, user.email))
        ) {
          return "/sign-in?error=UnverifiedEmail";
        }
      }
      return !!(await upsertOAuthUser({ email: user.email, name: user.name, image: user.image }));
    },
    async jwt({ token, user }) {
      // Only on sign-in. Resolved from our users collection by email, so the provider's own
      // id never becomes the session id.
      if (user?.email) {
        const claims = await sessionClaimsFor(user.email);
        if (!claims) return null;
        token.id = claims.id;
        token.authVersion = claims.authVersion;
      }
      return token;
    },
  },
});
