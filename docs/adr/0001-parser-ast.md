# ADR-0001: Parser AST — TypeScript Compiler API vs oxc-parser

**Status:** Proponowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
Reguły `require-tenant-scope`, `no-sensitive-logging` i (częściowo) `layer-boundaries` potrzebują AST. Budżet hooka z AST to p95 < 300 ms (docs/09), a bez AST < 80 ms. Sam import pakietu `typescript` zajmuje typowo 150–300 ms (duży pojedynczy plik JS), co może zjeść cały budżet przy każdym zapisie pliku przez agenta. Do zmierzenia w T-011 na docelowej maszynie.

## Rozważane opcje
### Opcja A: `typescript` (Compiler API, tylko `createSourceFile`, bez type-checkera)
- ➕ dojrzały, kompletny, pełna zgodność ze składnią TS/TSX, bardzo dużo przykładów
- ➕ często już obecny w projekcie użytkownika (peer dependency → zero dodatkowego rozmiaru)
- ➖ koszt importu 150–300 ms, czyli ryzyko budżetu B3
- Koszt zmiany: średni, jeśli schowamy parser za fasadą `src/core/ast/`

### Opcja B: `oxc-parser` (Rust, napi, ESTree-compatible AST)
- ➕ import i parsowanie rzędu kilkunastu ms
- ➕ AST w formacie ESTree (prostsze helpery)
- ➖ binarka natywna per platforma (instalacja, rzadkie platformy, rozmiar)
- ➖ młodszy projekt, ryzyko zmian API
- Koszt zmiany: średni (fasada)

### Opcja C: leksykalny tokenizer własny dla prostych przypadków + AST tylko dla `require-tenant-scope`
- ➕ większość reguł bez parsera
- ➖ własny tokenizer to ryzyko błędów (stringi, template literals, regexy, JSX)

## Decyzja
**Do podjęcia w T-011 po benchmarku.** Niezależnie od wyniku:
- parser jest za fasadą `src/core/ast/` (reguły nie importują parsera bezpośrednio),
- parser jest ładowany leniwie (`await import`) tylko gdy aktywna reguła ma `needsAst: true` i plik przeszedł pre-filtr.

Benchmark (T-011): czas `import()` + `parse` dla plików 100 / 500 / 2000 linii TSX, 30 powtórzeń, p50/p95, macOS + Linux.

## Konsekwencje
Zależne od wyniku. Uzupełnić po pomiarze.

## Weryfikacja
B3 (docs/09) w CI benchmarku. Powrót do decyzji, jeśli p95 B3 > 250 ms przez 3 kolejne PR.

## Dla autora: czego uczy ta decyzja
Fasada (Facade) nad zależnością zewnętrzną odracza decyzję i obniża koszt jej zmiany: kod domenowy zależy od Twojego interfejsu, nie od biblioteki. Decyzje wydajnościowe podejmujemy na podstawie pomiaru, nie intuicji.
