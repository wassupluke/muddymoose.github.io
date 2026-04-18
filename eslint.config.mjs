import globals from "globals";

export default [
  {
    ignores: ["node_modules/**", "tests/**", "playwright.config.js"],
  },
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: globals.browser,
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": "warn",
      "no-unreachable": "error",
      "no-constant-condition": "error",
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "no-empty": "warn",
      "no-redeclare": "error",
      "no-self-assign": "error",
      "use-isnan": "error",
      "valid-typeof": "error",
    },
  },
];
