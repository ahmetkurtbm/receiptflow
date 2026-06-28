import NextAuth from "next-auth";

const issuer = process.env.GATEHUB_ISSUER ?? "http://localhost:3000/api/auth";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ??
    "receiptflow-development-secret-change-before-production",
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [
    {
      id: "gatehub",
      name: "GateHub",
      type: "oidc",
      issuer,
      clientId: process.env.GATEHUB_CLIENT_ID ?? "receiptflow-not-configured",
      clientSecret:
        process.env.GATEHUB_CLIENT_SECRET ?? "receiptflow-not-configured",
      authorization: {
        params: { scope: "openid profile email offline_access" },
      },
      checks: ["pkce", "state"],
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name ?? profile.email ?? "ReceiptFlow kullanıcısı",
          email: profile.email,
          image: profile.picture,
        };
      },
    },
  ],
  callbacks: {
    authorized({ auth: session }) {
      return Boolean(session?.user);
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
});

export function isGateHubConfigured() {
  return Boolean(
    process.env.GATEHUB_CLIENT_ID && process.env.GATEHUB_CLIENT_SECRET,
  );
}
