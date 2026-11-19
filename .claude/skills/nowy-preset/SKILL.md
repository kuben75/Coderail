---
name: nowy-preset
description: Dodanie lub zmiana presetu konfiguracji CodeRail (np. nextjs-app, node-api, strict-saas) wraz z detekcją stacku i testem snapshotu rozwiniętej konfiguracji.
argument-hint: "[nazwa-presetu]"
paths:
  - "src/presets/**"
---

# Preset: $ARGUMENTS

Zasady: `.claude/rules/presety.md`. Schemat configu: `docs/06-konfiguracja.md`.

## Procedura
1. **Cel presetu**: dla jakiego stacku, jakie ryzyka adresuje, czym różni się od istniejących. Opisz w `docs/06-konfiguracja.md` (sekcja Presety) przed kodem.
2. **Sygnały detekcji**: co w repo wskazuje na ten stack (zależności w `package.json`, pliki jak `next.config.*`, `prisma/schema.prisma`, `nest-cli.json`). Dopisz je do `src/adapters/stack-detector.ts` i dodaj fixture repo w `tests/fixtures/stacks/<nazwa>/` (minimalny `package.json` i pliki-sygnały).
3. **Konfiguracja**: `src/presets/<nazwa>.ts`, czysty obiekt typu `PresetDefinition` (`extends`, `rules`, `layers`, `protectedPaths`).
   - reguły z ryzykiem FP domyślnie `warn`
   - `layers` dopasowane do konwencji katalogów tego stacku (np. Next.js App Router: `app/**` jako ui, `server/**` lub `lib/server/**` jako application)
4. **Test**: `tests/presets/<nazwa>.test.ts`
   - snapshot rozwiniętej konfiguracji (po scaleniu `extends`)
   - konfiguracja przechodzi walidację schematu zod
   - detektor wybiera ten preset dla fixture'a repo, a NIE wybiera go dla innych fixture'ów stacków
5. **Rejestr**: `src/presets/index.ts`.
6. Changeset `minor`, `/weryfikacja`.

## Pułapki
- Kolejność detekcji: bardziej szczegółowy preset wygrywa (`strict-saas` > `nextjs-app`). Testuj konflikt.
- Nie wpisuj ścieżek specyficznych dla jednego projektu. Preset jest dla tysięcy repozytoriów.
