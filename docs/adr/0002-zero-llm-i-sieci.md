# ADR-0002: Zero LLM i zero sieci w runtime

**Status:** Zaakceptowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
CodeRail uruchamia się przy każdym kroku agenta. Musi być szybki (< 300 ms), deterministyczny (ten sam kod → ta sama decyzja), działać offline i nie wysyłać kodu użytkownika nigdzie.

## Rozważane opcje
### Opcja A: reguły statyczne (AST + regex + config)
- ➕ deterministyczne, szybkie, testowalne fixture'ami, prywatne, zero kosztów
- ➖ nie ocenią „intencji” ani jakości nazw

### Opcja B: LLM jako sędzia (np. prompt hook)
- ➕ elastyczność
- ➖ sekundy opóźnienia, koszt per wywołanie, niedeterminizm, wysyłanie kodu na zewnątrz, nowe ryzyko prompt injection

## Decyzja
Opcja A. Żadnych wywołań LLM, żadnej telemetrii ani sprawdzania aktualizacji w runtime.

## Konsekwencje
- reguły muszą być precyzyjne i wąskie; czego nie da się rozstrzygnąć statycznie, świadomie NIE łapiemy (sekcje „NIE łapie” w katalogu)
- ewentualne przyszłe funkcje sieciowe tylko jako jawna komenda użytkownika + nowy ADR

## Weryfikacja
Test e2e uruchamia CLI z zablokowaną siecią (np. `--experimental-permission` / sandbox w CI) i przechodzi.

## Dla autora: czego uczy ta decyzja
Ograniczenia to cecha produktu: „deterministyczny i lokalny” jest obietnicą, którą użytkownik rozumie i której ufa. Najlepsze decyzje architektoniczne często polegają na tym, czego świadomie nie robimy.
