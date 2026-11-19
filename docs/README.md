# Dokumentacja CodeRail

| # | Dokument | Dla kogo | O czym |
|---|---|---|---|
| 01 | [Wizja i zakres](01-wizja-i-zakres.md) | wszyscy | problem, użytkownik, MVP, czego świadomie NIE robimy, model biznesowy |
| 02 | [Architektura](02-architektura.md) | dev, agent | warstwy, przepływ danych, porty, bezpieczeństwo, decyzje |
| 03 | [Kontrakty](03-kontrakty.md) | dev, agent | typy `Rule`, `Violation`, `CheckContext`, `Config`, błędy, kody wyjścia |
| 04 | [Katalog reguł](04-katalog-regul.md) | dev, agent, użytkownik | specyfikacja każdej reguły: łapie / nie łapie / opcje / przykłady |
| 05 | [Integracja z Claude Code](05-integracja-claude-code.md) | dev, agent | zdarzenia hooków, payloady, odpowiedzi, strategia warstw |
| 06 | [Konfiguracja](06-konfiguracja.md) | użytkownik, dev | `coderail.config.ts`, presety, scalanie |
| 07 | [Komunikaty](07-komunikaty.md) | dev, agent | format why/fix, zasady treści, przykłady |
| 08 | [Testowanie](08-testowanie.md) | dev, agent | piramida, fixture'y, e2e, pokrycie |
| 09 | [Wydajność](09-wydajnosc.md) | dev, agent | budżety, pomiar, typowe pułapki |
| 10 | [Git workflow](10-git-workflow.md) | dev, agent | gałęzie, commity, PR, CI, release, ochrona gałęzi |
| 11 | [Praca z agentem](11-praca-z-agentem.md) | Ty | cykl sesji, kiedy który skill, Definition of Done, jak reagować na blokady |
| 12 | [Roadmapa](12-roadmapa.md) | wszyscy | etapy 0–3, zadania `T-xxx` z zakresem i kryteriami |
| — | [ADR](adr/) | dev, agent | decyzje architektoniczne |
| — | [Słownik](slownik.md) | wszyscy | pojęcia |

## Zasady dokumentacji
- Dokumentacja opisuje **stan docelowy MVP** (spec), a kod ma go dogonić. Gdy kod świadomie odbiega od specu, aktualizujemy spec w tym samym PR.
- Historia decyzji żyje w ADR i gicie, nie w dokumentach.
- Przykłady komunikatów i configu kopiujemy z testów, gdy tylko istnieją.
