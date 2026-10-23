import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Same as GG-ops: let the compiler memoize instead of hand-written useMemo/useCallback.
  reactCompiler: true,
  // Server-only packages stay out of the server bundle trace.
  serverExternalPackages: ["mongoose", "bcryptjs", "nodemailer"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
