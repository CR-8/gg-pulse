import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";
import { env } from "@/lib/env";

export type OAuthProviderId = "google" | "github";

/** OAuth providers whose credentials are configured; the sign-in page renders a button for each. */
export function enabledOAuthProviders(): OAuthProviderId[] {
  const ids: OAuthProviderId[] = [];
  if (env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET) ids.push("google");
  if (env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET) ids.push("github");
  return ids;
}

function oauthProviders() {
  return enabledOAuthProviders().map((id) =>
    id === "google"
      ? Google({ clientId: env.AUTH_GOOGLE_ID, clientSecret: env.AUTH_GOOGLE_SECRET })
      : GitHub({ clientId: env.AUTH_GITHUB_ID, clientSecret: env.AUTH_GITHUB_SECRET }),
  );
}

/**
 * Proxy-safe half of the Auth.js config (no Mongoose). `src/lib/auth.ts` adds Credentials and
 * the database callbacks. JWT claims (`id`, `authVersion`) match GG-ops.
 */
export const authConfig = {
  providers: oauthProviders(),
  pages: { signIn: "/sign-in", error: "/sign-in" },
  session: { strategy: "jwt" },
  callbacks: {
    session({ session, token }) {
      if (session.user) {
        if (typeof token.id === "string") session.user.id = token.id;
        session.user.authVersion = typeof token.authVersion === "number" ? token.authVersion : 0;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
