import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // ".claude" son las carpetas de trabajo del agente (worktrees de git con una
  // copia entera del proyecto adentro, tsconfig incluido). Sin excluirlas,
  // eslint lintea el proyecto varias veces y -- peor -- typescript-eslint
  // encuentra varios tsconfig.json candidatos a raiz y falla a parsear TODOS
  // los archivos ("multiple candidate TSConfigRootDirs are present").
  { ignores: ["dist", ".claude"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: globals.browser,
      // La raiz es esta carpeta y no se adivina: ver el comentario de arriba.
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
  prettier
);
