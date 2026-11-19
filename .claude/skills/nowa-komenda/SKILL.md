---
name: nowa-komenda
description: Dodanie lub zmiana komendy CLI CodeRail (init, check, hook, explain) — cienka warstwa w src/cli/commands, logika w core/adapterach, kody wyjścia z kontraktu, test e2e na zbudowanym CLI.
argument-hint: "[nazwa-komendy]"
paths:
  - "src/cli/**"
---

# Komenda CLI: $ARGUMENTS

Zasady: `.claude/rules/cli.md`. Kontrakt wyjścia: `docs/03-kontrakty.md` i `docs/05-integracja-claude-code.md`.

## Procedura
1. **Spec**: składnia, flagi, przykłady użycia, kody wyjścia, format wyjścia (`text`/`json`). Dopisz do README (sekcja Komendy) i do odpowiedniego dokumentu w `docs/`.
2. **Test e2e najpierw**: `tests/e2e/<komenda>.e2e.test.ts` uruchamia `node dist/cli.js <komenda> ...` jako proces (`execFile`) w tymczasowym repo. Sprawdza: kod wyjścia, stdout, stderr. Dla `hook`: payload ze `tests/fixtures/hook-payloads/`.
3. **Plik komendy**: `src/cli/commands/<komenda>.ts` eksportuje `register(program)` lub `run(args, deps)`.
   - parsuje i waliduje argumenty (zod)
   - pobiera zależności z `composition.ts`
   - wywołuje core
   - przekazuje wynik do `output.ts`
   - zwraca kod wyjścia (nie woła `process.exit` sam; robi to `index.ts`)
4. **Rejestracja**: dynamiczny import w `src/cli/index.ts`. Sprawdź, że `coderail hook` nie zaczął ładować nowych modułów (`npm run bench`, scenariusz zimnego startu).
5. **Help**: `--help` ma opis, przykład i link do dokumentacji.
6. `/weryfikacja`, changeset.

## Pułapki
- Nie mieszaj stdout i stderr. W trybie `hook` stdout jest zarezerwowany dla JSON.
- Brak TTY i `CI=true` oznacza zero promptów.
- Ścieżki w argumentach są względne do `cwd`, a nie do lokalizacji CLI.
