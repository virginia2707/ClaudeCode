import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Le motif `const { id: _id, ...rest } = row` sert à retirer des colonnes
      // avant une copie : les clés écartées à côté d'un rest ne sont pas des
      // variables inutilisées. Le reste est une erreur, pas un avertissement.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Ancien produit conservé pour référence, hors périmètre MissionIA.
    "legacy/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
