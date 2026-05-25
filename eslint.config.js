import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['src/parsers/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['node:*', 'fs', 'fs/*', 'path', 'path/*', 'chokidar', 'fs-extra'],
            message: 'parsers/ must be pure: no Node-only APIs. Pass strings in from the caller.' },
          { group: ['*/server/*', '*/client/*', '../server/*', '../client/*'],
            message: 'parsers/ is a leaf — it cannot import from server/ or client/.' },
        ],
      }],
    },
  },

  {
    files: ['src/types/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['*/server/*', '*/client/*'],
            message: 'types/ is a leaf — server/ and client/ depend on it, not the other way.' },
        ],
      }],
    },
  },

  { ignores: ['dist/**', 'node_modules/**'] },
);
