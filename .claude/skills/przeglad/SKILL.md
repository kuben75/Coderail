---
name: przeglad
description: Wieloagentowy przegląd zmian na gałęzi przed PR — równolegle uruchamia subagentów (architektura, testy, bezpieczeństwo, reguły) na diffie względem main, zbiera uwagi w jeden raport z priorytetami. Użyj po /weryfikacja, przed /pr.
allowed-tools: Bash(git diff*) Bash(git log*) Bash(git status*) Read Grep Glob
---

# Przegląd zmian

## Kontekst
- Gałąź: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
- Pliki zmienione względem main: !`git diff --stat main...HEAD 2>/dev/null | tail -30 || true`
- Niezacommitowane: !`git status --short 2>/dev/null || true`

## Procedura
1. Ustal zbiór plików: commity na gałęzi (`git diff main...HEAD --name-only`) plus zmiany niezacommitowane.
2. **Uruchom równolegle** (w jednej wiadomości, kilka wywołań narzędzia Agent) tych subagentów, których dotyczą zmiany:
   | Subagent | Kiedy |
   |---|---|
   | `straznik-architektury` | zawsze, gdy zmieniono `src/**` |
   | `audytor-testow` | zawsze, gdy zmieniono `src/**` lub `tests/**` |
   | `recenzent-regul` | gdy zmieniono `src/rules/**` lub `tests/fixtures/**` |
   | `audytor-bezpieczenstwa` | gdy zmieniono `src/adapters/**`, `src/cli/**`, regexy, obsługę ścieżek lub procesów |

   Każdemu podaj: listę plików, cel zadania z `task.json` i polecenie „raportuj tylko problemy z dowodem (plik:linia), bez pochwał”.
3. **Weryfikuj uwagi**, zanim je przekażesz. Dla każdej uwagi sprawdź w kodzie, czy jest prawdziwa. Odrzuć fałszywe i napisz, dlaczego.
4. Raport w formacie:
   ```
   ## Przegląd: <T-xxx>
   ### 🔴 Blokujące (napraw przed PR)
   - [arch] src/rules/x.ts:12 — import z adapters … → przenieś …
   ### 🟡 Do rozważenia
   ### ⚪ Odrzucone uwagi subagentów (i dlaczego)
   ```
5. Blokujące naprawiasz w ramach zadania (w zakresie). Jeśli naprawa wychodzi poza zakres, zapytaj człowieka.
6. Po naprawach ponownie `/weryfikacja`.

Subagenci są **tylko do odczytu**. Nigdy nie poprawiają kodu sami.
