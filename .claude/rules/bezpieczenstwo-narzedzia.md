---
paths:
  - "src/**"
  - "scripts/**"
---
# Bezpieczeństwo samego narzędzia

CodeRail działa w repozytoriach użytkowników, z ich uprawnieniami, przy każdym kroku agenta. Narzędzie bezpieczeństwa z dziurą jest gorsze niż brak narzędzia.

## Zasady
- **Zero sieci w runtime.** Żadnych `fetch`, telemetrii ani sprawdzania aktualizacji. Jedynym wyjątkiem może być kiedyś jawna komenda wywołana przez użytkownika, z ADR.
- **Zero wykonywania kodu użytkownika poza configiem.** Jedyny wykonywany plik to `coderail.config.ts|mjs` (świadomie, jak w ESLint/Vite). Nie wykonujemy plików analizowanych ani `package.json` scripts.
- **Procesy potomne**: tylko `git`, tylko `execFile`/`spawn` z tablicą argumentów, `--` przed ścieżkami, timeout, `stdio` bez dziedziczenia stdin hooka.
- **Path traversal**: każda ścieżka z payloadu lub configu jest normalizowana i musi leżeć w katalogu projektu. Symlinki wychodzące poza projekt są ignorowane.
- **ReDoS**: wzorce z configu użytkownika (np. własne `protectedPaths`, wzorce sekretów) kompilujemy z limitem długości wejścia i testem czasu. Globy obsługuje sprawdzona biblioteka (np. `picomatch`), nie własny regex.
- **Redakcja**: sekrety, tokeny i URL-e z hasłem nie mogą trafić na stdout/stderr, do logów, snapshotów testów ani raportów JSON.
- **Fail-open vs fail-closed**: błąd wewnętrzny w trybie `hook` domyślnie przepuszcza (exit 0 + ostrzeżenie), żeby nie zablokować pracy. Użytkownik może ustawić `failMode: 'closed'`. Decyzja w ADR-0004. Testy pokrywają obie ścieżki.
- **Supply chain**: minimalna liczba zależności runtime (cel ≤ 5). `npm ci` z lockfile, `npm audit --omit=dev` w CI, publikacja z `--provenance`.

Przegląd bezpieczeństwa każdego PR dotykającego `src/adapters/` robi subagent `audytor-bezpieczenstwa`.
