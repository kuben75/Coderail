---
paths:
  - "src/presets/**"
---
# Presety

Preset to **czyste dane**: obiekt `Config` (lub fabryka bez efektów ubocznych) z rozsądnymi wartościami domyślnymi dla danego stacku.

## Zasady
- Presety MVP: `node-api`, `nextjs-app`, `strict-saas` (= `nextjs-app` + `require-tenant-scope` + ostrzejsze progi).
- Preset może dziedziczyć (`extends`). Scalanie robi core (`config.ts`), deterministycznie: tablice zastępują, obiekty scalają głęboko.
- **Domyślnie bezpiecznie dla nowego użytkownika.** Reguły z ryzykiem fałszywych alarmów (np. `scope-guard`) startują jako `warn`, nie `error`.
- Każdy preset ma test snapshotu rozwiniętej konfiguracji (`tests/presets/<preset>.test.ts`). Zmiana snapshotu wymaga zgody człowieka (hook pyta).
- Zmiana domyślnych wartości presetu to zmiana zachowania dla użytkowników: changeset `minor` + wpis „Zmiany w presetach” w opisie.
- Wykrywanie, który preset pasuje, to NIE preset. To robi `src/adapters/stack-detector.ts`.
