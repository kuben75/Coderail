---
name: bootstrap
description: Jednorazowy bootstrap repozytorium CodeRail (zadanie T-001) — package.json z kontraktem skryptów, tsconfig strict, ESLint, Prettier, vitest z progami pokrycia, dependency-cruiser, knip, tsup, publint/attw, changesets, struktura katalogów i git hooki. Wywoływany przez człowieka raz, na początku projektu.
disable-model-invocation: true
allowed-tools: Bash(npm run *) Bash(npx tsc *) Bash(git status*) Bash(mkdir -p *) Read Write Edit Glob
---

# Bootstrap projektu (T-001)

Cel: puste repo → zielone `npm run verify` na szkielecie bez logiki biznesowej. Po tym zadaniu każdy kolejny krok ma pełną siatkę bezpieczeństwa.

**Nie piszesz tu żadnej logiki produktu** (silnika, reguł, adapterów). Tylko konfiguracja, struktura i jeden test-sentinel.

## 0. Warunki
- Aktywne zadanie T-001 (`/start-zadania T-001`) ze scope: `package.json`, `tsconfig*.json`, `eslint.config.mjs`, `vitest.config.ts`, `tsup.config.ts`, `.dependency-cruiser.cjs`, `knip.json`, `.prettierrc.json`, `.prettierignore`, `.changeset/**`, `src/**`, `tests/**`, `scripts/**`.
- Sprawdź dostępność nazwy na npm: `npm view coderail name`. Jeśli jest zajęta, ZATRZYMAJ SIĘ i zapytaj człowieka o nazwę (np. scoped `@<user>/coderail`).

## 1. Zależności
Zainstaluj **najnowsze stabilne** wersje (nie wpisuj wersji z pamięci). Każda komenda `npm install` wymaga zgody człowieka (hook zapyta). To oczekiwane:
```bash
npm init -y
npm install zod commander picomatch
npm install -D typescript @types/node @types/picomatch tsup vitest @vitest/coverage-v8 \
  eslint @eslint/js typescript-eslint @vitest/eslint-plugin prettier \
  dependency-cruiser knip publint @arethetypeswrong/cli @changesets/cli
```
Parser AST (`typescript` jako runtime vs `oxc-parser`) i `@clack/prompts`/`jiti` **nie** teraz. Dochodzą w zadaniach, które ich potrzebują (ADR-0001 rozstrzyga parser po benchmarku).

## 2. Pliki konfiguracyjne
Utwórz je dokładnie według [references/konfiguracje.md](references/konfiguracje.md). Po utworzeniu każdego pliku sprawdź opcje z dokumentacją zainstalowanej wersji narzędzia (API ESLint, vitest i dependency-cruiser zmienia się między majorami). Jeśli opcja nie istnieje, dostosuj ją i zapisz różnicę w podsumowaniu.

## 3. Struktura katalogów
```
src/
  cli/        index.ts (#!/usr/bin/env node, tylko `--version` na razie), output.ts, composition.ts, commands/
  core/       types.ts (pusty eksport typu + TODO(T-010)), errors.ts, ports.ts
  rules/      index.ts (pusty rejestr), security/, architecture/
  adapters/   claude-code/
  presets/    index.ts
  index.ts    publiczne API (na razie re-eksport typów)
tests/
  core/       sentinel.test.ts (1 prawdziwy test, np. CodeRailError ma `code`)
  rules/  adapters/  e2e/  bench/  helpers/
  fixtures/   hook-payloads/ (.gitkeep)
scripts/      (puste, .gitkeep)
.changeset/   config.json, README.md
```
Pliki w `src/` mogą zawierać tylko minimalny, poprawny kod potrzebny, żeby narzędzia przeszły (`knip` nie może zgłaszać nieużywanych eksportów: eksportuj je przez `src/index.ts`).

## 4. Git hooki
`npm run prepare` ustawia `core.hooksPath` na `.githooks` (pliki już istnieją w repo, nie edytuj ich). Sprawdź: `git rev-parse --git-path hooks` → `.githooks`. (Nie używaj `git config core.hooksPath`: `pre-bash-guard` blokuje każde polecenie `git config` dotykające `core.hooksPath`, także sam odczyt).

## 5. Weryfikacja końcowa
Każda komenda musi przejść:
```bash
npm run typecheck && npm run lint && npm run format:check && npm run arch \
 && npm run test:coverage && npm run knip && npm run build && npm run lint:package
node dist/cli.js --version
```
Dodatkowo **test negatywny barier**. Tymczasowo dodaj w `src/core/` plik z `import fs from 'node:fs'` i potwierdź, że blokuje go hook `post-edit-check` oraz że `npm run arch` go zgłasza. Następnie usuń plik.

## 6. Domknięcie
- `docs/12-roadmapa.md`: odhacz T-001
- changeset: pusty (`npx changeset add --empty`), bo to infrastruktura
- `/commit` → `/pr`
