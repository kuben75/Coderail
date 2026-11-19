---
paths:
  - "src/adapters/**"
---
# Warstwa adapters

Adaptery tłumaczą świat zewnętrzny (stdin z Claude Code, git, system plików, plik configu) na typy z core i z powrotem. **Każde wejście z zewnątrz jest niezaufane.**

## Zasady
- **Waliduj na granicy.** JSON ze stdin hooka parsuj schematem zod (`hook-input.ts`). Nieznane pola ignoruj (Claude Code dodaje nowe pola w kolejnych wersjach). Brakujące wymagane pola dają `HookInputError`. Nie zgaduj.
- **Git tylko przez `execFile` / `spawn` z tablicą argumentów.** Nigdy `exec` ani `shell: true`. Ścieżki plików pochodzą od modelu, więc trzeba wykluczyć wstrzyknięcie komend. Przed ścieżką od użytkownika zawsze stawiaj `--` (`git diff -- <path>`).
- **Ścieżki normalizuj i ograniczaj do katalogu projektu.** `path.resolve(root, p)` musi zaczynać się od `root + path.sep`, inaczej odrzucasz (path traversal: `../../etc/passwd`). Na Windows porównuj bez rozróżniania wielkości liter.
- **Timeouty na każdym procesie potomnym** (domyślnie 2 s dla git). Przekroczenie to typowany błąd, nie zawieszony hook.
- **Edit w PreToolUse = symulacja wyniku.** Dla `Edit` oblicz treść po zmianie w pamięci (`old_string` → `new_string`, z uwzględnieniem `replace_all`). Jeśli `old_string` nie występuje w pliku, nie blokuj (narzędzie i tak się nie wykona). Zwróć `skip`.
- **Wyjście do Claude Code** (`hook-output.ts`): albo JSON na stdout + exit 0, albo tekst na stderr + exit 2. Nigdy oba. Format i pola zgodne z `docs/05-integracja-claude-code.md`.
- **Generowanie `.claude/settings.json`** (komenda `init`): scalaj z istniejącym plikiem, nie nadpisuj. Zachowaj obce hooki użytkownika i kolejność kluczy. Pokaż diff przed zapisem.
- Adapter nie podejmuje decyzji domenowych („czy to naruszenie”). Pobiera dane i przekazuje je do core.

## Testy adapterów
- Testy integracyjne na prawdziwym tymczasowym repo git (`tests/helpers/temp-repo.ts`), nie na mockach `child_process`.
- Payloady Claude Code: prawdziwe przykłady w `tests/fixtures/hook-payloads/*.json` (po jednym na zdarzenie i narzędzie).
