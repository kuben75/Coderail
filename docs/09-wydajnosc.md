# 09. Wydajność

Hook CodeRail uruchamia się przy **każdym** zapisie pliku przez agenta. Opóźnienie mnoży się przez dziesiątki zapisów na zadanie. Użytkownik wyłączy wolny hook szybciej niż hook z fałszywym alarmem.

## Budżety (p95, maszyna dev: laptop klasy M1/Ryzen 7, Node 22, SSD)
| # | Scenariusz | Budżet | Mierzy |
|---|---|---|---|
| B1 | zimny start: `node dist/cli.js --version` | **< 60 ms** | `bench:hook` |
| B2 | `hook pre-tool-use`, Write 500 linii, reguły bez AST | **< 80 ms** | `bench:hook` |
| B3 | `hook post-tool-use`, plik 500 linii, reguły z AST (pierwsze parsowanie) | **< 300 ms** | `bench:hook` |
| B4 | `hook stop`, 10 zmienionych plików | < 1 s | `bench:hook` |
| B5 | `check --staged`, 20 plików | < 1,5 s | `bench:hook` |
| B6 | pojedyncza reguła regex na pliku 500 linii | < 2 ms | `vitest bench` |
| B7 | wejście 100 KB dla każdego regexu (ReDoS) | < 50 ms | test jednostkowy |

Zmiana budżetu wymaga zgody człowieka i ADR. CI uruchamia benchmark na PR i komentuje wynik (twardo blokuje tylko B1–B3 przy przekroczeniu > 20% ze względu na szum runnerów).

## Gdzie idzie czas (model mentalny)
| Składnik | Typowo | Jak ograniczamy |
|---|---|---|
| start Node | 25–40 ms | nic (stała) |
| `npx` wrapper | 100–300 ms | `init` wpisuje bezpośrednią ścieżkę do `dist/cli.js`, gdy pakiet jest lokalny |
| import modułów CLI | 5–50 ms | dynamiczne importy komend; `hook` nie ładuje `@clack/prompts`, `jiti`, parsera |
| ładowanie configu `.ts` | 20–80 ms (jiti) | `.mjs`/`.json` bez jiti; cache skompilowanego configu w `node_modules/.cache/coderail` (T-024) |
| import parsera AST | 150–300 ms (`typescript`), 10–30 ms (`oxc-parser`) | lazy + pre-filtr; wybór parsera w ADR-0001 po pomiarze |
| parsowanie pliku | 2–20 ms | jedno parsowanie na plik, współdzielone |
| git (diff/show) | 5–20 ms na wywołanie | minimum wywołań, batch (`git diff --name-only` raz) |

## Zasady w kodzie
`.claude/rules/wydajnosc.md`. Najważniejsze: dynamiczne importy, pre-filtr przed regex/AST, regexy kompilowane raz, brak skanowania repo w hooku.

## Jak mierzyć
- `npm run bench`: mikro (vitest bench)
- `npm run bench:hook`: makro (30× proces z payloadami, raport p50/p95/max; skrypt w T-022)
- profil: `node --cpu-prof dist/cli.js hook pre-tool-use < tests/fixtures/hook-payloads/pre-write-ts.json`, potem otwórz `.cpuprofile` w Chrome DevTools
- czas importów: `node --import ./scripts/trace-imports.mjs dist/cli.js --version` (opcjonalny skrypt) lub `NODE_DEBUG=module`

Procedura porównania z `main`: skill `/benchmark`.
