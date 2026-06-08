import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // service_role client 仅允许在 Route Handler 中使用
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/app/api/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin"],
              message:
                "service_role client 仅允许在 Route Handler (src/app/api/) 中使用。",
            },
          ],
        },
      ],
    },
  },
]);

export default eslintConfig;
