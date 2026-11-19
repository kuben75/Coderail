# 12. Roadmapa

Każde zadanie ma ID `T-xxx`, zależności, sugerowany zakres (dla scope guard) i kryteria akceptacji. `/start-zadania T-xxx` czyta ten plik. Odhaczasz `[x]` w PR, który dowozi zadanie.

Legenda zakresu: ścieżki zawsze dozwolone (`docs/**`, `.changeset/**`) nie są wypisywane.

---

## Etap 0: Setup pracy z agentem ✅ (to repo)
- [x] **T-000** CLAUDE.md, `.claude/{rules,skills,agents,hooks}`, docs, githooks, CI, szablony

## Etap 1: Fundament (dni 1–4)

- [ ] **T-001 Bootstrap repozytorium**: skill `/bootstrap`
  - zakres: `package.json`, `tsconfig*.json`, `eslint.config.mjs`, `vitest.config.ts`, `tsup.config.ts`, `.dependency-cruiser.cjs`, `knip.json`, `.prettier*`, `.changeset/**`, `src/**`, `tests/**`, `scripts/**`
  - akceptacja: `npm run verify` zielone; `node dist/cli.js --version`; test negatywny: import `node:fs` w `src/core` blokowany przez hook i `npm run arch`; CI zielone na PR

- [ ] **T-010 Kontrakty core + harness reguł** (zależy: T-001)
  - zakres: `src/core/{types,errors,ports,diff,messages,redact}.ts`, `src/index.ts`, `tests/core/**`, `tests/helpers/**`
  - akceptacja: typy zgodne z `docs/03-kontrakty.md`; `diff.ts` z testami brzegowymi (CRLF, pusty, brak `\n` na końcu, zakresy nakładające się); `redact()` przetestowane; harness `loadFixtures`/`runRule` działa na przykładowej regule testowej w `tests/helpers/`

- [ ] **T-011 Silnik + fasada AST + decyzja parsera** (zależy: T-010)
  - zakres: `src/core/{engine,config}.ts`, `src/core/ast/**`, `tests/core/**`, `tests/bench/**`, `docs/adr/0001-*.md` (nowy ADR, jeśli zmiana)
  - akceptacja: izolacja crashu reguły; deterministyczna kolejność; schemat configu (zod) z czytelnymi błędami; benchmark `typescript` vs `oxc-parser` (import + parsowanie 500 linii) z wynikami w ADR-0001 → decyzja człowieka; lazy-load parsera potwierdzony testem (moduł nie jest załadowany, gdy żadna reguła nie ma `needsAst`)

- [ ] **T-012 Reguła `no-secrets`** (zależy: T-011): skill `/nowa-regula no-secrets`
  - zakres: `src/rules/security/no-secrets.ts`, `src/rules/index.ts`, `tests/rules/no-secrets.test.ts`, `tests/fixtures/no-secrets/**`, `tests/bench/**`
  - akceptacja: checklista `nowa-regula`; entropia jako osobna funkcja z testami; evidence zredagowane

- [ ] **T-013 Adapter git + fs** (zależy: T-010)
  - zakres: `src/adapters/{git,fs}.ts`, `tests/adapters/**`, `tests/helpers/temp-repo.ts`
  - akceptacja: staged files, hunks → `changedLines`, `show HEAD:path`; tylko `execFile` + `--`; timeout; path traversal odrzucany (testy z `../`, symlink na zewnątrz, ścieżka zaczynająca się od `-`); przegląd `audytor-bezpieczenstwa`

## Etap 2: Integracja i reguły (dni 5–10)

- [ ] **T-020 Adapter Claude Code + komenda `hook`** (zależy: T-011, T-013)
  - zakres: `src/adapters/claude-code/**`, `src/cli/{index,output,composition}.ts`, `src/cli/commands/hook.ts`, `tests/e2e/**`, `tests/fixtures/hook-payloads/**`
  - akceptacja: payloady zarejestrowane z prawdziwego Claude Code (min. Write, Edit, MultiEdit, Stop); symulacja Edit; mapowanie decyzji → exit 0/2/JSON wg `docs/05`; odporność (pusty/nie-JSON/5 MB/poza projektem) wg `failMode`; weryfikacja szczegółów API hooków z aktualną dokumentacją i aktualizacja `docs/05`

- [ ] **T-021 Komenda `check` (+ `--staged`, `--format json`)** (zależy: T-020)
  - zakres: `src/cli/commands/check.ts`, `src/cli/output.ts`, `tests/e2e/**`
  - akceptacja: exit 0/1/3/4; JSON z `version: 1`; kolory tylko TTY i bez `NO_COLOR`

- [ ] **T-022 Benchmark makro (`scripts/bench-hook.mjs`) + job CI** (zależy: T-020)
  - zakres: `scripts/bench-hook.mjs`, `tests/bench/**`, `.github/workflows/ci.yml` (hook zapyta: CI chronione)
  - akceptacja: raport p50/p95/max dla B1–B5; porównanie z budżetem; decyzja `npx` vs bezpośrednia ścieżka w `init`

- [ ] **T-023 Reguła `protected-paths`** (zależy: T-020)
- [ ] **T-024 Ładowanie configu (`.ts` przez jiti lazy, `.mjs`, `.json`) + cache** (zależy: T-011)
- [ ] **T-025 Reguła `layer-boundaries`** (zależy: T-011, T-024): rozwiązywanie aliasów `tsconfig.paths`, `'use client'`
- [ ] **T-026 Reguła `no-ai-cheats`** (zależy: T-013): linie + changeset (osłabione testy vs HEAD), pomijanie stringów i komentarzy, `ignore-added-by-agent`
- [ ] **T-027 Reguła `require-tenant-scope` (Prisma)** (zależy: T-011): AST, `tx.`/`this.prisma.`, klucze złożone, spread/zmienne zgodnie ze specem
- [ ] **T-028 Reguła `no-sensitive-logging`** (zależy: T-011)
- [ ] **T-029 Reguła `scope-guard`** (zależy: T-013, T-020)
- [ ] **T-030 Dogfooding**: CodeRail pilnuje sam siebie (zależy: T-023…T-029)
  - zakres: `coderail.config.ts` (w repo), `.claude/settings.json`, `.githooks/pre-commit` (zmiany wykonuje **człowiek**, bo pliki są chronione; agent przygotowuje diff do wklejenia)
  - akceptacja: hooki `.claude/hooks/post-edit-check.mjs` i część `pre-edit-guard.mjs` zastąpione przez `coderail hook …`; zachowanie bez regresji (te same scenariusze z `.claude/hooks/README.md`)

## Etap 3: Init, presety, publikacja (dni 11–14)

- [ ] **T-040 Detektor stacku + presety `node-api`, `nextjs-app`, `strict-saas`**: skill `/nowy-preset`
- [ ] **T-041 Komenda `init`** (kreator `@clack/prompts` lazy; scalanie `settings.json` z diffem; pre-commit; `--yes` dla CI)
- [ ] **T-042 Komenda `explain <rule-id>`** (tryb nauki: spec + bad/good z fixture'ów)
- [ ] **T-043 Drizzle w `require-tenant-scope`**
- [ ] **T-044 Test e2e z prawdziwym Claude Code**: skill `/test-hooka`, raport w `docs/raporty/`, ≥ 4/5 scenariuszy poprawionych w 1. próbie
- [ ] **T-045 README produktu (EN) + GIF demo + publikacja 0.1.0** (release przez changesets, provenance)

## Po MVP (backlog, bez kolejności)
- reguły v2 z `docs/04-katalog-regul.md` → Backlog
- `locale` dla komunikatów (PL)
- programatyczne API `check()` dla integracji
- Starter Kit (decyzja po realnych użytkownikach)
