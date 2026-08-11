// Linara Mobile — Flat ESLint Security & Formatting Configuration
// Customized specifically to prevent unexpected inputs and validate data types in React Native/Expo.

import expoConfig from "eslint-config-expo/flat.js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactPlugin from "eslint-plugin-react";
import hooksPlugin from "eslint-plugin-react-hooks";
import prettierPlugin from "eslint-plugin-prettier";

export default [
  ...expoConfig,
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "@typescript-eslint": tsPlugin,
      react: reactPlugin,
      "react-hooks": hooksPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      // 1. Data Validation & Type Safety Checks
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/explicit-module-boundary-types": "off",

      // 2. Prevent Unvalidated Property Lookups on Nullable Variables
      "no-restricted-syntax": [
        "error",
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message:
            "Please use process.env via typed environment modules rather than direct, unvalidated process.env property lookups.",
        },
      ],

      // 3. Prevent Memory Leaking and Hook Boundary Issues
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // 4. Formatting Standards Integration
      "prettier/prettier": [
        "error",
        {
          semi: true,
          singleQuote: false,
          trailingComma: "all",
          printWidth: 100,
          tabWidth: 2,
        },
      ],
    },
  },
];
