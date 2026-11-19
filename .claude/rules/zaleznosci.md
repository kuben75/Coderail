---
paths:
  - "package.json"
---
# Zależności

## Zanim dodasz zależność (zawsze pytaj człowieka)
Odpowiedz w wiadomości na 5 pytań:
1. **Czy Node 22+ ma to wbudowane?** (`node:util` parseArgs/styleText, `node:test`, `fs.glob`, `structuredClone`, `fetch`, `node:crypto`)
2. **Runtime czy dev?** Runtime trafia do każdego użytkownika i do ścieżki hooka.
3. **Koszt importu** (ms) i rozmiar (`npm view <pkg> dist.unpackedSize`).
4. **Kondycja**: utrzymanie, liczba zależności przechodnich, licencja (MIT/ISC/Apache-2.0/BSD; bez GPL w runtime).
5. **Alternatywa**: co byś napisał sam i ile by to kosztowało.

## Zatwierdzony zestaw (MVP)
| Pakiet | Typ | Rola |
|---|---|---|
| `zod` | runtime | walidacja configu i payloadów hooka |
| `commander` | runtime | parsowanie argumentów CLI |
| `picomatch` | runtime | globy (protectedPaths, scope, layers) |
| `typescript` *lub* `oxc-parser` | runtime (lazy) | AST, decyzja w ADR-0001 po benchmarku |
| `@clack/prompts` | runtime (lazy, tylko `init`) | kreator |
| `jiti` | runtime (lazy, tylko config `.ts`) | ładowanie `coderail.config.ts` |
| `typescript`, `tsup`, `vitest`, `@vitest/coverage-v8`, `eslint`, `typescript-eslint`, `@vitest/eslint-plugin`, `prettier`, `dependency-cruiser`, `knip`, `publint`, `@arethetypeswrong/cli`, `@changesets/cli`, `@types/node` | dev | build i jakość |

Wszystko spoza tej listy wymaga zgody człowieka i dopisania tutaj (przez człowieka).

## Zasady
- Instalacja tylko przez `npm install` (lockfile aktualizuje się sam; ręczna edycja `package-lock.json` jest zablokowana).
- Wersje: `^` dla dev, dokładne lub `^` dla runtime według decyzji przy dodaniu. `engines.node: ">=22"`.
- Nie dodawaj zależności „na zapas”. Nieużywane zależności wykrywa `knip` w CI.
