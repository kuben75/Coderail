# ADR-0004: Fail-open domyślnie w trybie hook, `failMode: 'closed'` opcjonalnie

**Status:** Proponowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
Błąd wewnętrzny CodeRail (crash, niepoprawny config, nieoczekiwany payload po aktualizacji Claude Code) w trybie hook może: (a) zablokować każdy zapis agenta, co paraliżuje pracę i skłania użytkownika do usunięcia hooka, albo (b) przepuścić zapis, co otwiera lukę.

## Rozważane opcje
### Opcja A: fail-open (exit 0 + ostrzeżenie na stderr)
- ➕ zepsute narzędzie nie paraliżuje pracy; użytkownik widzi ostrzeżenie
- ➖ celowo wywołany crash mógłby obejść blokadę

### Opcja B: fail-closed (blokada przy każdym błędzie)
- ➕ maksymalne bezpieczeństwo
- ➖ jedna regresja = wszyscy użytkownicy zablokowani; ryzyko wyłączenia narzędzia

## Decyzja
Fail-open domyślnie dla **błędów całego procesu** (config, parsowanie payloadu, nieoczekiwany wyjątek). Crash **pojedynczej reguły** jest izolowany przez silnik: pozostałe reguły nadal mogą zablokować, więc celowy crash jednej reguły nie otwiera pozostałych. Użytkownik może ustawić `failMode: 'closed'` (preset `strict-saas` proponuje to w `init`).

## Konsekwencje
- testy obu trybów dla każdej klasy błędu
- ostrzeżenie fail-open zawsze widoczne (stderr) i zliczane w `stats`
- audyt bezpieczeństwa sprawdza, czy da się wywołać crash procesu treścią pliku (duże pliki, złe UTF-8) i czy to obchodzi blokady

## Weryfikacja
E2E: payloady uszkodzone → exit 0 + ostrzeżenie (open) / exit 2 (closed).

## Dla autora: czego uczy ta decyzja
W systemach bezpieczeństwa wybór fail-open/fail-closed to świadomy kompromis między dostępnością a ochroną. Izolacja błędów (bulkhead) pozwala mieć oba naraz: awaria jednej części nie wyłącza pozostałych.
