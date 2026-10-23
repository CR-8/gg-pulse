import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".claude/**", ".venv/**", "data/**"]),
  {
    // Services take the actor as an argument, so UI code must reach them through the
    // "use server" actions, which derive the actor from the session.
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/service", "@/modules/*/service.ts"],
              message: "Import the module's actions (session-derived actor), not its service.",
            },
          ],
        },
      ],
    },
  },
]);
