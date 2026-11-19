# ADR-0003: Architektura hexagonal-lite (Functional Core, Imperative Shell)

**Status:** Zaakceptowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
Ten sam silnik reguł obsługuje trzy wejścia (stdin hooka Claude Code, git staged, pliki w CI) i kilka wyjść (exit code + stderr, JSON, raport terminalowy). Reguły muszą być testowalne tysiącami fixture'ów w milisekundach. Autor uczy się architektury, więc struktura ma być czytelna i egzekwowalna.

## Rozważane opcje
### Opcja A: płaska struktura (komendy wołają reguły, reguły czytają pliki)
- ➕ szybki start
- ➖ reguły z I/O → wolne testy z mockami; każde nowe wejście = zmiany w regułach

### Opcja B: hexagonal-lite: core (czysty) + porty + adaptery + CLI jako composition root
- ➕ reguły to czyste funkcje → testy bez mocków; nowe wejście = nowy adapter
- ➕ granice egzekwowalne narzędziami (dependency-cruiser, hook, później sam CodeRail)
- ➖ więcej plików i jedna warstwa pośrednia (porty)

### Opcja C: pełne Clean Architecture (use cases, encje, DTO na każdej granicy)
- ➖ ceremonia nieproporcjonalna do rozmiaru CLI

## Decyzja
Opcja B. Warstwy: `core` ← `rules`, `presets`; `adapters` → `core`; `cli` składa wszystko. Szczegóły i tabela zależności: docs/02-architektura.md.

## Konsekwencje
- Łatwiejsze: testy reguł, dodawanie wejść (np. przyszłe wsparcie innych agentów), dogfooding `layer-boundaries`
- Trudniejsze: każda nowa potrzeba I/O w regule wymaga rozszerzenia `CheckContext` lub portu (to celowe tarcie)

## Weryfikacja
`npm run arch` zielone w CI; czas pełnego zestawu testów reguł < 5 s przy 7 regułach.

## Dla autora: czego uczy ta decyzja
Dependency Inversion: logika biznesowa definiuje interfejsy (porty), a świat zewnętrzny je implementuje (adaptery). Dzięki temu najważniejszy kod jest najprostszy do testowania. To samo podejście przenosi się na NestJS (providers jako adaptery) i Next.js (server actions jako cienka powłoka nad domeną).
