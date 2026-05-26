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
    // Generated/compiled files:
    "public/sw.js",
    "public/sw.js.map",
    "public/**/*.js",
    "public/**/*.js.map",
    "dist/**",
  ]),
  // Configure unused variables rule to ignore underscore-prefixed variables
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Jest config files are CommonJS by convention (next/jest ships as CJS);
  // require() is expected there.
  {
    files: ["jest.config.js", "jest.database.config.js", "jest.database.setup.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Design-system guardrail: forbid raw Tailwind color classes in app/route
  // code so authors reach for `bg-(--bento-tint-*)`, `text-role-*`, or
  // role-themed CSS variables instead of `bg-blue-500`, `text-purple-600`,
  // etc. The lint rule fires on any JSXAttribute whose name is `className`
  // and whose literal value contains one of the forbidden raw colors.
  //
  // Exemptions:
  //   - `src/components/ui/**`     (primitives may define raw color)
  //   - `src/app/ui-preview/**`    (dev-only catalog)
  //   - `src/app/(public)/admin/**` (legacy admin sample pages)
  //   - status helpers may need `red/amber/emerald` for explicit semantic
  //     score buckets (`getScoreColor` etc.) — those are intentionally
  //     coloured by score, not by role tint.
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    ignores: [
      "src/components/ui/**",
      "src/app/ui-preview/**",
      "src/app/(public)/admin/**",
    ],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: String.raw`JSXAttribute[name.name='className'] > Literal[value=/\b(bg|text|border|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)\b/]`,
          message:
            "Avoid raw Tailwind palette classes outside components/ui/. Use the design tokens: bg-(--bento-tint-*), text-role-*, text-(--bento-*-d), or extend BentoCard. See components/ui/bento-card.tsx.",
        },
        {
          selector: String.raw`JSXAttribute[name.name='className'] > JSXExpressionContainer > TemplateLiteral > TemplateElement[value.raw=/\b(bg|text|border|ring|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(50|100|200|300|400|500|600|700|800|900)\b/]`,
          message:
            "Avoid raw Tailwind palette classes outside components/ui/. Use the design tokens: bg-(--bento-tint-*), text-role-*, text-(--bento-*-d), or extend BentoCard. See components/ui/bento-card.tsx.",
        },
      ],
    },
  },
]);

export default eslintConfig;
