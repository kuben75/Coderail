---
paths:
  - "src/**"
---
# Architektura (hexagonal-lite)

Pełny opis: `docs/02-architektura.md`. Decyzja: ADR-0003.

## Kierunek zależności: tylko do środka

```
cli  ──►  adapters  ──►  core  ◄──  rules
 │                        ▲          ▲
 └──────►  presets  ──────┴──────────┘
```

| Warstwa | Może importować | NIE może importować |
|---|---|---|
| `src/core/` | tylko `src/core/**`, `zod`, parser AST (lazy, w `src/core/ast/`) | `cli`, `adapters`, `rules`, `presets`, `node:fs`, `node:child_process`, `node:process`, `console` |
| `src/rules/` | `src/core/**` (typy, helpery AST, diff) | `cli`, `adapters`, `presets`, jakiekolwiek I/O |
| `src/presets/` | `src/core/**` (typy configu), ID reguł z `src/rules/index.ts` | `cli`, `adapters`, `node:*` |
| `src/adapters/` | `src/core/**`, `node:*`, biblioteki integracyjne | `cli`, `rules` |
| `src/cli/` | wszystko powyżej | — (to composition root) |

Egzekwują to: hook `post-edit-check.mjs` (natychmiast), `dependency-cruiser` (`npm run arch`, w CI) i reguła produktu `layer-boundaries` (dogfooding, od Etapu 2).

## Zasady
- **Porty w core, implementacje w adapterach.** Jeśli core potrzebuje czegoś z zewnątrz (pliki, git, czas), definiujesz interfejs w `src/core/ports.ts`, implementujesz go w `src/adapters/`, a wpinasz w `src/cli/composition.ts`.
- **Reguła to czysta funkcja.** `check(ctx, options) => Violation[]`. Wszystkie dane wejściowe są w `CheckContext`. Nie ma I/O, stanu globalnego ani zależności od kolejności uruchomienia.
- **Jedno miejsce wyjścia.** Tylko `src/cli/output.ts` pisze na stdout/stderr. Tylko `src/cli/` woła `process.exit`. Reszta zwraca wartości albo rzuca `CodeRailError` (`src/core/errors.ts`).
- **Brak cykli.** Cykl importów oznacza błąd w granicach modułów. Naprawiasz go przeniesieniem typu do core, nie leniwym importem.
- **Plik < 300 linii, funkcja < 50 linii.** Większe dziel według odpowiedzialności, nie mechanicznie.
- **Nazwy plików**: `kebab-case.ts`. Jeden główny eksport na plik reguły (`export const noSecrets: Rule<...>`).
- **Barrel files tylko w `src/rules/index.ts` (rejestr) i `src/index.ts` (publiczne API).** Gdzie indziej importuj bezpośrednio z pliku. Barrele spowalniają start CLI.

## Gdy nie wiesz, gdzie coś położyć
Zadaj pytania po kolei:
1. Czy to logika decyzyjna bez I/O? → `core` albo `rules`.
2. Czy rozmawia ze światem (fs, git, stdin, Claude Code)? → `adapters`.
3. Czy to parsowanie argumentów, prompt albo formatowanie wyjścia? → `cli`.
4. Czy to gotowy zestaw ustawień? → `presets`.

Nadal niejasne → zapytaj człowieka i zaproponuj ADR (`/adr`).
