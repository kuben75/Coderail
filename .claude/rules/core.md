---
paths:
  - "src/core/**"
---
# Warstwa core

Rdzeń to serce produktu: typy kontraktów, silnik uruchamiający reguły, schemat configu, diff i fasada AST. Musi być **deterministyczny, szybki i testowalny bez mocków**.

## Twarde zasady
- **Kontrakty w `types.ts` to publiczne API.** Każda zmiana pola w `Rule`, `Violation`, `CheckContext` lub `Config` to zmiana łamiąca. Wymaga zgody człowieka, ADR i changesetu `major` (w 0.x: `minor` z opisem BREAKING).
- **Silnik (`engine.ts`) nie zna konkretnych reguł.** Dostaje listę reguł i kontekst. Rejestr reguł żyje w `src/rules/index.ts`.
- **Izolacja błędów reguł.** Wyjątek w jednej regule nie zatrzymuje pozostałych. Silnik łapie go i zwraca `InternalRuleError` z ID reguły. Wynik pozostałych reguł jest ważny.
- **Determinizm.** Ta sama konfiguracja i te same pliki dają ten sam wynik, w tej samej kolejności. Sortuj naruszenia po (plik, linia, kolumna, ruleId). Bez `Date.now()`, `Math.random()` i iteracji po `Object.keys` obiektów o niekontrolowanym kształcie bez sortowania.
- **Leniwy AST.** `ctx.ast()` parsuje plik przy pierwszym wywołaniu i cache'uje wynik na czas jednego uruchomienia. Moduł parsera ładujesz dynamicznie (`await import(...)`) tylko wtedy, gdy któraś aktywna reguła ma `meta.needsAst: true`. Import `typescript` kosztuje około 150–300 ms (patrz ADR-0001).
- **Diff jest pierwszoklasowy.** `ctx.changedLines` to zakresy linii dodanych lub zmienionych. Reguły `scope: 'line'` raportują tylko w tych zakresach. Logika przecinania zakresów żyje w `diff.ts` i ma testy brzegowe (pusty plik, CRLF, ostatnia linia bez `\n`).
- **Walidacja configu przez zod.** Błąd configu = `ConfigError` z ścieżką pola i zrozumiałym komunikatem. Nigdy nie rzucaj surowego `ZodError` do użytkownika.

## Błędy
- Wszystkie błędy domenowe dziedziczą po `CodeRailError` z polem `code` (np. `CONFIG_INVALID`, `RULE_CRASHED`, `HOOK_INPUT_INVALID`).
- Nie łap błędów po to, żeby je zignorować. Albo obsługujesz konkretny przypadek, albo pozwalasz mu wypłynąć do CLI.
