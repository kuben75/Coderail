---
paths:
  - "docs/**"
  - "README.md"
  - "CONTRIBUTING.md"
---
# Dokumentacja

- **Dokumentacja jest częścią zmiany.** Zmiana zachowania reguły, komendy, configu lub kodu wyjścia bez aktualizacji odpowiedniego pliku w `docs/` jest niekompletna.
  | Zmieniasz | Aktualizujesz |
  |---|---|
  | regułę | `docs/04-katalog-regul.md` (spec + przykłady) |
  | typy kontraktów | `docs/03-kontrakty.md` |
  | integrację z Claude Code | `docs/05-integracja-claude-code.md` |
  | schemat configu lub presety | `docs/06-konfiguracja.md` |
  | format komunikatów | `docs/07-komunikaty.md` |
  | budżety wydajności | `docs/09-wydajnosc.md` (tylko za zgodą człowieka) |
  | decyzję architektoniczną | nowy ADR w `docs/adr/` (skill `/adr`) |
- **Dokumentacja po polsku**, przykłady kodu i komunikaty CLI po angielsku.
- **Opisuj stan obecny**, nie historię. Historia to git i ADR. Bez sekcji typu „Status migracji”, „było/jest”.
- **Zaakceptowanych ADR nie edytujesz** (blokuje hook). Nowa decyzja = nowy ADR, który zastępuje stary.
- **Odhaczanie roadmapy** (`docs/12-roadmapa.md`) robisz tylko w PR, który faktycznie dowozi zadanie.
- Przykłady w dokumentacji muszą być prawdziwe. Fragmenty configu i komunikatów kopiuj z testów lub fixture'ów, nie pisz z pamięci.
