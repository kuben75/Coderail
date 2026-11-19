---
name: weryfikacja
description: Pełna weryfikacja przed ogłoszeniem zadania jako gotowe — drabina komend (typecheck, lint, architektura, testy, pokrycie, knip, build, publint), kryteria akceptacji z task.json i Definition of Done. Użyj przed każdym "gotowe", przed /commit i /pr.
allowed-tools: Bash(npm run *) Bash(npx vitest *) Bash(git status*) Bash(git diff*) Read Grep Glob
---

# Weryfikacja

## Kontekst
- Zadanie: !`cat .claude/state/task.json 2>/dev/null || echo "(brak aktywnego zadania)"`
- Zmienione pliki: !`git status --short 2>/dev/null || true`

## 1. Drabina weryfikacji (w tej kolejności, zatrzymaj się na pierwszym błędzie)
| # | Komenda | Co sprawdza |
|---|---|---|
| 1 | `npm run typecheck` | tsc --noEmit, strict |
| 2 | `npm run lint` | ESLint (typescript-eslint strictTypeChecked + vitest) |
| 3 | `npm run format:check` | Prettier |
| 4 | `npm run arch` | dependency-cruiser: granice warstw, brak cykli |
| 5 | `npm run test:coverage` | vitest + progi pokrycia |
| 6 | `npm run knip` | nieużywane pliki, eksporty i zależności |
| 7 | `npm run build` | tsup → dist |
| 8 | `npm run lint:package` | publint + attw (poprawność paczki npm) |
| 9 | `npm run test:e2e` | e2e na zbudowanym CLI (jeśli zmieniono cli/adapters) |
| 10 | `npm run bench` | tylko jeśli zmieniono core, reguły z AST albo ścieżkę hooka |

Skrót: `npm run verify` uruchamia 1–9. Jeśli skrypt jeszcze nie istnieje (przed T-001 bootstrap), napisz to i pomiń, nie udawaj.

**Błąd w kroku → napraw przyczynę.** Niedozwolone obejścia: obniżanie progów, `.skip`, `eslint-disable`, `@ts-ignore`, wykluczanie plików z konfiguracji narzędzi, usuwanie asercji.

## 2. Kryteria akceptacji
Dla każdego punktu `acceptance` z `task.json` podaj **dowód**: nazwę testu, komendę i wynik, ścieżkę pliku. Bez dowodu punkt jest niespełniony.

## 3. Definition of Done
- [ ] zmiany tylko w zakresie zadania (`git status` vs `scope`)
- [ ] test-first: istnieje test, który był czerwony bez zmiany
- [ ] dokumentacja zaktualizowana (tabela w `.claude/rules/dokumentacja.md`)
- [ ] changeset (dla zmian w `src/`)
- [ ] brak TODO/FIXME bez numeru zadania (`TODO(T-xxx):`)
- [ ] brak plików tymczasowych, debug logów, zakomentowanego kodu
- [ ] `followups.md` zawiera pomysły spoza zakresu (zamiast ich realizacji)

## 4. Raport dla człowieka
```
## Weryfikacja: <T-xxx>
Wynik: ✅ gotowe / ⚠️ gotowe z zastrzeżeniami / ❌ niegotowe
Drabina: typecheck ✅ lint ✅ format ✅ arch ✅ test 142/142 ✅ (pokrycie core 94%) knip ✅ build ✅ package ✅ e2e ✅ bench: hook p95 41 ms (budżet 80)
Kryteria: 1. … — dowód: tests/rules/no-secrets.test.ts "redacts…" ✅
Zastrzeżenia / czego nie zweryfikowałem: …
Follow-upy: …
```
Zastrzeżenia piszesz zawsze, nawet jeśli brzmią źle. Ukrycie problemu jest gorsze niż problem.
