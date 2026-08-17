import js from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
  js.configs.recommended,

  {
    files: ["src/**/*.{js,jsx}", "demo/src/**/*.{js,jsx}"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooks,
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
      },
    },
    settings: {
      react: { version: "18" },
    },
    rules: {
      "react/jsx-uses-react": "error",
      "react/jsx-uses-vars": "error",
      "react/prop-types": "off",
      "react/display-name": "warn",
      "react/no-unknown-property": "error",
      "react/jsx-no-duplicate-props": "error",
      "react/jsx-no-undef": "error",
      "react/no-direct-mutation-state": "error",
      "react/self-closing-comp": "warn",

      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "off",

      "no-unused-vars": ["warn", {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
      }],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-undef": "error",
      "no-duplicate-case": "error",
      "no-unreachable": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "prefer-const": "warn",
    },
  },

  {
    files: ["src/**/*.test.{js,jsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
  },

  {
    ignores: ["dist/**", "node_modules/**", "coverage/**"],
  },
];
