# 08. Testowanie

## Filozofia
CodeRail to narzędzie, któremu użytkownik ma zaufać bardziej niż agentowi. Dlatego:
1. **Każde zachowanie reguły jest udokumentowane fixture'em.** Fixture'y to wykonywalna specyfikacja.
2. **Fałszywy alarm = brakujący fixture `good/`.** Naprawa zaczyna się od jego dodania.
3. **Testy nigdy nie są osłabiane**, żeby zazielenić build. Pilnują tego hooki, ESLint, subagent `audytor-testow` i reguła `no-ai-cheats` (od Etapu 2).

## Piramida i lokalizacja
| Poziom | Katalog | Narzędzie | Uruchamianie |
|---|---|---|---|
| Reguły (fixture'y) | `tests/rules/` + `tests/fixtures/<rule-id>/` | vitest, harness `tests/helpers/rule-harness.ts` | `npm test` |
| Core | `tests/core/` | vitest | `npm test` |
| Adaptery (integracja) | `tests/adapters/` | vitest + tymczasowe repo git (`tests/helpers/temp-repo.ts`) | `npm test` |
| E2E CLI | `tests/e2e/*.e2e.test.ts` | vitest, proces `node dist/cli.js` | `npm run test:e2e` (buduje najpierw) |
| Payloady Claude Code | `tests/fixtures/hook-payloads/*.json` | używane przez e2e | — |
| Stacki do detekcji | `tests/fixtures/stacks/<nazwa>/` | testy `stack-detector` i `init` | — |
| Benchmark | `tests/bench/*.bench.ts` + `scripts/bench-hook.mjs` | vitest bench, pomiar procesu | `npm run bench`, `npm run bench:hook` |
| Zachowanie agenta | piaskownica poza repo | prawdziwy Claude Code | skill `/test-hooka` (ręcznie, przed release) |

## Harness reguł (T-010)
`tests/helpers/rule-harness.ts` udostępnia:
- `loadFixtures(ruleId)` → `{ bad, good, edge, byName(name) }`, parsuje nagłówki `// expect:` i `// why-good:` (lub `<plik>.expect.json`)
- `runRule(rule, fixture, overrides?)` → buduje `CheckContext` (ten sam builder co produkcja, `changedLines: 'all'` domyślnie) i uruchamia regułę przez silnik (izolacja błędów, sortowanie)
- `runChangeset(rule, dir)` dla fixture'ów `before/` + `after/`

Dodanie przypadku = dodanie pliku. Test reguły nie wymaga edycji (`describe.each` po katalogach).

## Wymagania na regułę
| Co | Minimum |
|---|---|
| fixture'y `bad/` | 5 |
| fixture'y `good/` (w tym „podobne do bad, ale poprawne”) | 5 |
| fixture'y `edge/` (komentarz, string, ignore z/bez powodu, ignore dodany przez agenta, CRLF, pusty, 100 KB) | 3 (docelowo wszystkie) |
| test redakcji (security) | 1 |
| test konkretności `message.agent` | 1 |
| test `changedLines` (scope: line) | 1 |
| test czasu: 100 KB < 50 ms | 1 |
| test opcji (domyślne + niestandardowe) | 1 |

## Pokrycie (CI blokuje poniżej)
| Obszar | Linie | Gałęzie |
|---|---|---|
| `src/core/**` | 90% | 85% |
| `src/rules/**` | 90% | 85% |
| całość | 80% | 75% |

Progi tylko rosną. Pokrycie to miara pomocnicza: 100% pokrycia bez fixture'ów `good/` nadal oznacza ryzyko FP.

## E2E: co sprawdzamy
- `hook pre-tool-use`: Write z sekretem → exit 2, stderr zawiera `no-secrets` i NIE zawiera wartości; Write poprawny → exit 0, puste stdout
- `hook pre-tool-use`: Edit z `old_string` nieistniejącym → exit 0
- `hook post-tool-use`: plik z zapytaniem bez `tenantId` → exit 2
- `hook stop`: `stop_hook_active: true` → exit 0 zawsze
- odporność: pusty stdin, nie-JSON, ścieżka poza projektem, 5 MB, nieznane pola → zgodnie z `failMode`
- `check --staged` w tymczasowym repo → exit 1 + raport; `--format json` waliduje się schematem
- `init` w fixture'ach stacków → poprawny preset, scalony `settings.json` (obce hooki zachowane)

## Zasady pisania testów
`.claude/rules/testy.md` (zakazy, determinizm, izolacja fs, asercje konkretne).
