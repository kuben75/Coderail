---
paths:
  - "**/*.ts"
  - "**/*.mts"
---
# TypeScript

## Konfiguracja (nie luzuj)
`strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`, `module`/`moduleResolution: NodeNext`. Paczka jest ESM-only (`"type": "module"`). Importy względne mają rozszerzenie `.js`.

## Zakazane (hook i ESLint blokują)
- `any` (jawne i niejawne), `as any`, `as unknown as T`
- `@ts-ignore`, `@ts-nocheck`. `@ts-expect-error` tylko z opisem ≥ 10 znaków, wyłącznie na błędy w typach bibliotek zewnętrznych.
- `eslint-disable` (całe pliki i linie). Jeśli reguła lintera jest zła, zmieniamy config, a nie kod.
- non-null assertion `!` na danych z zewnątrz (stdin, config, fs). Dozwolona tylko tam, gdzie niezmiennik wynika z kodu powyżej, z komentarzem.
- `enum`. Używaj unii literałów i obiektów `as const`.
- domyślne eksporty (`export default`). Wyjątek: pliki konfiguracyjne narzędzi (`*.config.ts`), które tego wymagają.

## Wzorce
- Dane z zewnątrz: `unknown` → schemat zod → typ wywnioskowany (`z.infer`). Typ i schemat mają jedno źródło prawdy.
- Wynik operacji, które mogą zawieść w przewidywalny sposób: unia dyskryminowana (`{ ok: true, value } | { ok: false, error }`). Wyjątki tylko dla sytuacji nieprzewidzianych.
- `readonly` na polach kontraktów (`Violation`, `CheckContext`) i `ReadonlyArray` w sygnaturach.
- Wyczerpujący `switch` po unii z `assertNever(x)` w `default`.
- Typy importuj przez `import type`.
- Funkcje publiczne (eksportowane z `src/index.ts`) mają TSDoc z przykładem.
