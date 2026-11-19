# Konfiguracje bazowe (T-001)

Wzorce do odtworzenia przy bootstrapie. Opcje sprawdzone pod Node 22, TypeScript 5.x, ESLint 9 (flat config), vitest 3.x. **Przy nowszych majorach zweryfikuj opcje w dokumentacji** i zapisz różnice w podsumowaniu zadania.

---

## package.json (pola i kontrakt skryptów)

Nazwy skryptów są **kontraktem**: używają ich hooki (`stop-verify.mjs` → `verify:fast`), CI, git hooki i skille. Nie zmieniaj nazw bez aktualizacji wszystkich tych miejsc.

```json
{
  "name": "coderail",
  "version": "0.0.0",
  "description": "Deterministic guardrails for AI coding agents (Claude Code hooks + git), turning architecture and security rules into hard checks.",
  "type": "module",
  "license": "MIT",
  "engines": { "node": ">=22" },
  "bin": { "coderail": "./dist/cli.js" },
  "exports": {
    ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" },
    "./package.json": "./package.json"
  },
  "files": ["dist", "README.md", "LICENSE"],
  "sideEffects": false,
  "publishConfig": { "access": "public", "provenance": true },
  "keywords": ["claude-code", "ai-agents", "guardrails", "hooks", "linter", "security", "architecture"],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "arch": "depcruise src --config .dependency-cruiser.cjs",
    "test": "vitest run --project unit",
    "test:watch": "vitest --project unit",
    "test:changed": "vitest run --project unit --changed HEAD --passWithNoTests",
    "test:coverage": "vitest run --project unit --coverage",
    "pretest:e2e": "npm run build",
    "test:e2e": "vitest run --project e2e --passWithNoTests",
    "bench": "vitest bench --run",
    "bench:hook": "node scripts/bench-hook.mjs",
    "knip": "knip",
    "lint:package": "publint --strict && attw --pack . --profile esm-only",
    "verify:fast": "npm run typecheck && npm run lint && npm run arch && npm run test:changed",
    "verify": "npm run typecheck && npm run lint && npm run format:check && npm run arch && npm run test:coverage && npm run knip && npm run build && npm run lint:package && npm run test:e2e",
    "changeset": "changeset",
    "prepare": "node -e \"try{require('node:child_process').execFileSync('git',['config','core.hooksPath','.githooks'],{stdio:'ignore'})}catch{}\""
  }
}
```

`bench:hook` (skrypt `scripts/bench-hook.mjs`) powstaje w T-022. Do tego czasu skrypt może nie istnieć.

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "types": ["node"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true,
    "useUnknownInCatchVariables": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "resolveJsonModule": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests", "*.config.ts"],
  "exclude": ["tests/fixtures", "dist", "coverage", "node_modules"]
}
```

`tests/fixtures` jest wykluczone: fixture'y zawierają celowo błędny kod.

---

## eslint.config.mjs

```js
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import vitest from '@vitest/eslint-plugin';

export default tseslint.config(
  { ignores: ['dist/', 'coverage/', 'tests/fixtures/', '.claude/', '.githooks/', 'node_modules/'] },
  {
    // Komentarze eslint-disable są niedozwolone w całym projekcie — zmieniamy kod albo config, nie wyciszamy.
    linterOptions: { noInlineConfig: true, reportUnusedDisableDirectives: 'error' },
  },
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': 'allow-with-description', minimumDescriptionLength: 10 },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      'no-console': 'error',
      'no-restricted-syntax': [
        'error',
        { selector: 'TSEnumDeclaration', message: 'Use a union of string literals or an `as const` object.' },
      ],
      'no-restricted-exports': ['error', { restrictDefaultExports: { direct: true } }],
      'max-lines': ['error', { max: 300, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
      complexity: ['warn', 12],
    },
  },
  { files: ['src/cli/output.ts'], rules: { 'no-console': 'off' } },
  {
    files: ['tests/**/*.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      'vitest/no-focused-tests': 'error',
      'vitest/no-disabled-tests': 'error',
      'vitest/expect-expect': 'error',
      'vitest/no-conditional-expect': 'error',
      'max-lines-per-function': 'off',
    },
  },
  {
    files: ['**/*.config.{ts,mjs}', 'eslint.config.mjs'],
    rules: { 'no-restricted-exports': 'off' },
  },
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
);
```

---

## .prettierrc.json / .prettierignore

```json
{ "singleQuote": true, "printWidth": 110, "trailingComma": "all", "semi": true, "endOfLine": "lf" }
```
```
dist
coverage
tests/fixtures
package-lock.json
CHANGELOG.md
.claude/state
```

---

## vitest.config.ts

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
          exclude: ['tests/e2e/**', 'tests/fixtures/**'],
        },
      },
      {
        extends: true,
        test: { name: 'e2e', include: ['tests/e2e/**/*.e2e.test.ts'], testTimeout: 20_000 },
      },
    ],
    sequence: { shuffle: process.env['CI'] === 'true' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/cli/index.ts'],
      reporter: ['text', 'json-summary', 'html'],
      thresholds: {
        lines: 80,
        branches: 75,
        functions: 80,
        statements: 80,
        'src/core/**': { lines: 90, branches: 85 },
        'src/rules/**': { lines: 90, branches: 85 },
      },
    },
    benchmark: { include: ['tests/bench/**/*.bench.ts'] },
  },
});
```

Progi pokrycia **tylko rosną**. Obniżenie wymaga zgody człowieka.

---

## tsup.config.ts

```ts
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { cli: 'src/cli/index.ts', index: 'src/index.ts' },
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  dts: { entry: { index: 'src/index.ts' } },
  splitting: true, // dynamiczne importy komend/parsera => osobne chunki => szybszy start hooka
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
});
```

Shebang `#!/usr/bin/env node` w pierwszej linii `src/cli/index.ts` (tsup go zachowuje).

---

## .dependency-cruiser.cjs

```js
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    { name: 'no-circular', severity: 'error', from: {}, to: { circular: true } },
    {
      name: 'core-is-pure',
      comment: 'core nie zależy od żadnej innej warstwy (docs/02-architektura.md)',
      severity: 'error',
      from: { path: '^src/core' },
      to: { path: '^src/(cli|adapters|rules|presets)' },
    },
    {
      name: 'core-no-io',
      severity: 'error',
      from: { path: '^src/core' },
      to: { dependencyTypes: ['core'], path: '^(node:)?(fs|fs/promises|child_process|net|http|https|os|process)$' },
    },
    {
      name: 'rules-are-pure',
      severity: 'error',
      from: { path: '^src/rules' },
      to: { path: '^src/(cli|adapters|presets)' },
    },
    {
      name: 'rules-no-io',
      severity: 'error',
      from: { path: '^src/rules' },
      to: { dependencyTypes: ['core'], path: '^(node:)?(fs|fs/promises|child_process|net|http|https|os|process)$' },
    },
    {
      name: 'presets-are-data',
      severity: 'error',
      from: { path: '^src/presets' },
      to: { path: '^src/(cli|adapters)' },
    },
    {
      name: 'adapters-not-to-cli-or-rules',
      severity: 'error',
      from: { path: '^src/adapters' },
      to: { path: '^src/(cli|rules)' },
    },
    {
      name: 'no-dev-deps-in-src',
      severity: 'error',
      from: { path: '^src' },
      to: { dependencyTypes: ['npm-dev'] },
    },
    { name: 'not-to-unresolvable', severity: 'error', from: {}, to: { couldNotResolve: true } },
    {
      name: 'no-orphans',
      severity: 'warn',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '^src/(index|cli/index)\\.ts$'] },
      to: {},
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    exclude: { path: '^(tests|dist|coverage)' },
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: { exportsFields: ['exports'], conditionNames: ['import', 'require', 'node', 'default'] },
  },
};
```

---

## knip.json

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/index.ts", "src/cli/index.ts", "scripts/*.mjs"],
  "project": ["src/**/*.ts", "scripts/**/*.mjs"],
  "ignore": ["tests/fixtures/**"],
  "ignoreBinaries": ["attw"]
}
```

---

## .changeset/config.json

```json
{
  "$schema": "https://unpkg.com/@changesets/config/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```
