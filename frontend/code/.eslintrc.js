module.exports = {
  extends: [
    "eslint:recommended",
    'plugin:import/recommended',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:sonarjs/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/eslint-recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:jsx-a11y/strict',
    // See https://github.com/prettier/eslint-config-prettier/blob/main/CHANGELOG.md#version-800-2021-02-21
    "plugin:prettier/recommended",
  ],
  plugins: ["prettier", "react"],
  env: {
    node: true,
    es2020: true
  },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
    sourceType: "module",
    ecmaVersion: 2020,
    tsconfigRootDir: __dirname,
    "ecmaFeatures": {
      "jsx": true
    }
  },
  rules: {
    "prettier/prettier": "error",
    //"function-paren-newline": ["error", "always"],
    "@typescript-eslint/explicit-module-boundary-types": "off", // IDE will show the return types
    "@typescript-eslint/restrict-template-expressions": "off", // We are OK with whatever type within template expressions
    "@typescript-eslint/no-empty-function": "off", // Empty functions are ok
    "no-useless-return": "error",
    "no-console": "error",
    "react/react-in-jsx-scope": "off", // With React 17, this is no longer needed
    "react-hooks/exhaustive-deps": "error",
  },
  settings: {
    "import/resolver": {
      node: {
        paths: ["src"],
        extensions: [".ts", ".tsx"] // Add .js, .jsx if needed
      }
    },
    "react": {
      "version": "detect"
    }
  }
};