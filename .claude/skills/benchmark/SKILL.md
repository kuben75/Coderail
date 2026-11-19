---
name: benchmark
description: Pomiar wydajności CodeRail względem budżetów (zimny start, hook pre/post-tool-use z regułami regex i AST, check --staged) i porównanie z main. Użyj po zmianach w core, regułach z AST, ścieżce hooka lub zależnościach.
allowed-tools: Bash(npm run *) Bash(node dist/*) Bash(git stash*) Bash(git switch *) Read
---

# Benchmark

Budżety: `docs/09-wydajnosc.md`. Zasady: `.claude/rules/wydajnosc.md`.

## Procedura
1. `npm run build` (benchmark mierzy `dist/`, nie źródła).
2. **Mikro**: `npm run bench` (vitest bench, `tests/bench/*.bench.ts`). Zanotuj p75/p99 i ops/s dla każdego scenariusza.
3. **Makro (prawdziwy proces, tak jak wywołuje go Claude Code)**:
   ```bash
   npm run bench:hook   # node scripts/bench-hook.mjs: 30 uruchomień `node dist/cli.js hook pre-tool-use` z payloadami z tests/fixtures/hook-payloads, raport p50/p95/max
   ```
   Jeśli skrypt nie istnieje, powstaje w zadaniu T-022. Do tego czasu zgłoś brak i zmierz ręcznie:
   ```bash
   for i in $(seq 1 30); do /usr/bin/time -f "%e" node dist/cli.js hook pre-tool-use < tests/fixtures/hook-payloads/pre-write-ts.json > /dev/null; done
   ```
4. **Porównanie z main**: zbuduj main w osobnym katalogu (`git worktree add ../coderail-main main`, potem `npm ci && npm run build`) i uruchom te same pomiary. Raportuj różnicę w %.
5. **Raport** (do opisu PR):
   ```
   | Scenariusz | main p95 | gałąź p95 | Δ | budżet | status |
   |---|---|---|---|---|---|
   | cold start --version | 38 ms | 39 ms | +3% | 60 ms | ✅ |
   | hook pre-tool-use (regex) | 52 ms | 55 ms | +6% | 80 ms | ✅ |
   | hook post-tool-use (AST) | 210 ms | 290 ms | +38% | 300 ms | ⚠️ |
   ```
6. **Regresja > 10%** lub przekroczony budżet: znajdź przyczynę (`node --cpu-prof dist/cli.js ...`, a potem analiza profilu: czasy importów, pierwsze wywołanie parsera). Nie podnoś budżetu bez zgody człowieka i ADR.

## Typowe przyczyny regresji
- statyczny import ciężkiego modułu w ścieżce hooka (parser, prompts, barrel file)
- parsowanie AST bez pre-filtra
- regex kompilowany w pętli
- wielokrotne czytanie tego samego pliku lub wywołanie git
