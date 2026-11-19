# 06. Konfiguracja

## Plik
`coderail.config.ts` (preferowany) | `coderail.config.mjs` | `coderail.config.json` w katalogu głównym projektu. Szukamy w tej kolejności. Brak pliku = preset wykryty automatycznie (z ostrzeżeniem „run coderail init”).

```ts
import { defineConfig } from 'coderail';

export default defineConfig({
  extends: 'strict-saas',
  failMode: 'open',
  include: ['src/**', 'app/**'],
  exclude: ['**/*.generated.ts'],

  layers: [
    { name: 'ui',             paths: ['app/**/page.tsx', 'components/**'], allow: ['application', 'shared'] },
    { name: 'application',    paths: ['src/server/**'],                    allow: ['domain', 'infrastructure', 'shared'] },
    { name: 'domain',         paths: ['src/domain/**'],                    allow: ['shared'] },
    { name: 'infrastructure', paths: ['src/infra/**', '@prisma/client'],   allow: ['domain', 'shared'] },
    { name: 'shared',         paths: ['src/shared/**'],                    allow: [] },
  ],

  tenancy: {
    orm: 'prisma',
    scopeFields: ['tenantId'],
    models: ['Invoice', 'Client', 'Contract', 'Task'],
  },

  protectedPaths: [
    { glob: 'prisma/migrations/**/migration.sql', reason: 'Applied migrations are immutable' },
    { glob: 'src/auth/**', reason: 'Security-critical auth configuration', mode: 'ask' },
  ],

  rules: {
    'no-sensitive-logging': 'error',
    'scope-guard': ['warn', { maxChangedFiles: 10 }],
    'require-tenant-scope': ['error', { strictVariables: false }],
  },
});
```

`export default` jest tu wymagany przez format pliku konfiguracyjnego (wyjątek od zasady „bez default exports” w kodzie źródłowym CodeRail).

## Pola
| Pole | Typ | Domyślnie | Opis |
|---|---|---|---|
| `extends` | preset lub lista | wykryty | presety scalane od lewej do prawej, config użytkownika na końcu |
| `failMode` | `'open' \| 'closed'` | `'open'` | zachowanie przy błędzie wewnętrznym w trybie hook (ADR-0004) |
| `include` | glob[] | `['src/**','app/**','lib/**','pages/**','server/**','components/**']` | które pliki w ogóle analizować |
| `exclude` | glob[] | `node_modules`, `dist`, `build`, `.next`, `coverage`, `**/*.d.ts`, `**/*.min.js` | dopisywane do domyślnych |
| `layers` | `{name, paths, allow}[]` | z presetu | `paths` mogą zawierać nazwy pakietów; pierwsza pasująca warstwa wygrywa |
| `tenancy` | `{orm, scopeFields, models}` | brak = `require-tenant-scope` nieaktywna | modele z `schema.prisma` podpowiada `init` |
| `protectedPaths` | `{glob, reason, mode?}[]` | z presetu | `mode: 'ask'` każe Claude Code pytać człowieka |
| `rules` | `{[id]: severity \| [severity, options]}` | z presetu | `'off'` wyłącza regułę |

## Scalanie (deterministyczne)
1. Wartości domyślne silnika → 2. presety z `extends` (od lewej) → 3. config użytkownika.
- obiekty: scalanie głębokie
- tablice (`include`, `layers`, `protectedPaths`): **zastępują** poprzednie, z wyjątkiem `exclude`, który się sumuje (bezpieczniej)
- `rules`: per ID; `[severity, options]` scala opcje głęboko z domyślnymi reguły

Wynik scalenia pokazuje `coderail check --print-config` (debug).

## Presety
| Preset | Dla kogo | Zawiera |
|---|---|---|
| `node-api` | Node/NestJS/Express API | `no-secrets` (error), `protected-paths` (error, migracje, `.env.example`, `*.guard.ts`), `no-sensitive-logging` (warn), `no-ai-cheats` (error dla osłabionych testów, warn dla reszty), `scope-guard` (warn), warstwy `controller → service → repository` (wykrywane po konwencji Nest: `*.controller.ts`, `*.service.ts`, `*.repository.ts`) |
| `nextjs-app` | Next.js App Router | jak `node-api` + `layer-boundaries` dla `'use client'`, zakaz `@prisma/client` w `app/**` / `components/**`, `middleware.ts` chroniony |
| `strict-saas` | multi-tenant SaaS | `nextjs-app` lub `node-api` (wg detekcji) + `require-tenant-scope` (error) + `no-sensitive-logging` (error) + `scope-guard` (error, `maxChangedFiles: 15`) |

## Detekcja stacku (`init`, `adapters/stack-detector.ts`)
| Sygnał | Wniosek |
|---|---|
| `next` w dependencies, `app/` lub `next.config.*` | `nextjs-app` |
| `@nestjs/core` lub `express`/`fastify` bez `next` | `node-api` |
| `prisma/schema.prisma` z polem `tenantId`/`organizationId` w ≥ 2 modelach | proponuj `strict-saas` + listę modeli |
| `drizzle-orm` | `tenancy.orm: 'drizzle'` |

`init` zawsze pokazuje wynik detekcji i pyta o potwierdzenie (w TTY). W CI lub z `--yes` przyjmuje detekcję bez pytania.
