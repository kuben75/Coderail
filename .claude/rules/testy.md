---
paths:
  - "tests/**"
  - "src/**/*.test.ts"
  - "vitest.config.*"
---
# Testy

Strategia: `docs/08-testowanie.md`. Narzędzie: vitest.

## Piramida
| Poziom | Gdzie | Co | Czas |
|---|---|---|---|
| Reguły (fixture'y) | `tests/rules/<id>.test.ts` | każdy plik bad/good/edge przez silnik | ms |
| Unit core | `tests/core/**` | silnik, diff, config, scalanie presetów | ms |
| Integracja adapterów | `tests/adapters/**` | prawdziwe tymczasowe repo git, prawdziwy fs w `os.tmpdir()` | < 1 s |
| E2E CLI | `tests/e2e/**` | zbudowane `dist/cli.js` uruchamiane jako proces z payloadami ze stdin | < 3 s |
| Benchmark | `tests/bench/**` | `vitest bench`, budżety z `docs/09-wydajnosc.md` | osobno |

## Zasady
- **Test reguły jest sterowany danymi.** Jeden test iteruje po plikach w `fixtures/<id>/{bad,good,edge}` i porównuje naruszenia z nagłówkami `// expect:`. Dodanie przypadku = dodanie pliku, bez edycji testu.
- **Asercje konkretne.** `toEqual`/`toStrictEqual` na pełnym kształcie (`ruleId`, `line`, `severity`). Nie `toBeTruthy()`, nie `toBeDefined()`, nie samo `length > 0`.
- **Sprawdzaj też komunikat.** Dla każdej reguły co najmniej jeden test sprawdza, że `message.agent` zawiera nazwę pliku lub symbolu z kontekstu (komunikat nie jest generyczny).
- **Zakaz**: `.only`, `.skip`, `.todo` w commitowanym kodzie, `test.fails` bez issue, usuwanie lub osłabianie istniejących asercji, mockowanie testowanej jednostki. Pilnuje tego hook `post-edit-check` i ESLint (`vitest/no-focused-tests`, `vitest/no-disabled-tests`).
- **Bez sieci, bez zegara, bez losowości.** Czas przez `vi.useFakeTimers()` lub wstrzyknięty zegar. Testy przechodzą offline i w dowolnej kolejności (`--sequence.shuffle` w CI).
- **Izolacja fs.** Każdy test z plikami tworzy własny katalog w `os.tmpdir()` i sprząta go w `afterEach`. Nigdy nie pisz do repo podczas testu.
- **Pokrycie** (CI): `src/core` i `src/rules` ≥ 90% linii i ≥ 85% gałęzi, całość ≥ 80%. Progi w `vitest.config.ts` tylko podnosimy, nigdy nie obniżamy bez zgody człowieka.
- **Czerwony test, którego nie umiesz naprawić**: nie zmieniaj oczekiwań. Zatrzymaj się, opisz rozbieżność (oczekiwane, faktyczne, hipoteza) i zapytaj.
