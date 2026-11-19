---
name: adr
description: Tworzy nowy Architecture Decision Record (ADR) w docs/adr/ według szablonu projektu — kontekst, rozważane opcje z kompromisami, decyzja, konsekwencje. Użyj przy każdej decyzji architektonicznej, wyborze biblioteki, zmianie kontraktu lub budżetu.
argument-hint: "[tytuł decyzji]"
allowed-tools: Read Glob Grep Bash(ls docs/adr*)
---

# Nowy ADR: $ARGUMENTS

## Istniejące ADR
!`ls docs/adr/ 2>/dev/null || true`

## Kiedy ADR jest wymagany
- wybór lub zmiana zależności runtime
- zmiana kontraktu publicznego (typy, schemat configu, kody wyjścia, format komunikatów)
- nowa warstwa lub moduł albo zmiana granic warstw
- zmiana budżetu wydajności lub polityki fail-open/closed
- odstępstwo od zasady z `.claude/rules/`

## Procedura
1. Numer: następny wolny (`NNNN`, 4 cyfry). Plik: `docs/adr/NNNN-krotki-tytul-kebab.md`.
2. Skopiuj strukturę z `docs/adr/0000-szablon.md`. Status zawsze **Proponowany** (akceptuje człowiek, zmieniając status w osobnym commicie).
3. Wypełnij:
   - **Kontekst**: problem, ograniczenia (wydajność, bezpieczeństwo, DX), fakty z pomiarów (liczby, nie przymiotniki)
   - **Opcje**: min. 2 realne opcje, dla każdej plusy, minusy i koszt zmiany decyzji w przyszłości
   - **Decyzja**: jedna, z uzasadnieniem odnoszącym się do kontekstu
   - **Konsekwencje**: co staje się łatwiejsze, co trudniejsze, co trzeba zmienić w kodzie, docs i rules
   - **Weryfikacja**: jak sprawdzimy, że decyzja była dobra (metryka, benchmark, test)
4. Jeśli ADR zastępuje stary: pole `Zastępuje: ADR-XXXX`. Starego **nie edytuj** (hook blokuje zaakceptowane ADR). Status starego zmieni człowiek.
5. Pokaż człowiekowi i poczekaj na decyzję. Do akceptacji ADR **nie implementuj** zmian, które z niego wynikają.

Tryb nauki: na końcu dodaj sekcję „Dla autora: czego uczy ta decyzja”, czyli 2–3 zdania o ogólnej zasadzie architektury, której dotyczy decyzja.
