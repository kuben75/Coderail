# ADR-0005: Język — kod i komunikaty CLI po angielsku, dokumentacja projektu po polsku

**Status:** Proponowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
Autor pracuje po polsku i chce, żeby dokumentacja procesu była po polsku. Produkt jest publikowany na npm dla globalnych użytkowników, a komunikaty CLI czyta przede wszystkim model AI, który najpewniej wykonuje dyrektywy po angielsku.

## Decyzja
- **EN**: kod, identyfikatory, nazwy plików w `src/`/`tests/`, ID reguł, komunikaty CLI (Why/Fix), changesety/CHANGELOG, README produktu (T-045)
- **PL**: `docs/`, `.claude/` (rules, skills, agents), komentarze wyjaśniające decyzje, opisy PR, rozmowa z agentem
- Struktura `meta.messages` jako funkcji umożliwia dodanie `locale: 'pl'` w v2

## Konsekwencje
- przykłady komunikatów w polskiej dokumentacji są po angielsku (kopiowane z testów)
- otwarcie projektu dla zagranicznych kontrybutorów wymagałoby tłumaczenia `docs/` (świadomie odłożone)

## Weryfikacja
Przy pierwszych zewnętrznych kontrybucjach: czy bariera językowa jest problemem.

## Dla autora: czego uczy ta decyzja
Decyzje „miękkie” (język, nazewnictwo) też warto zapisać. Inaczej każda sesja agenta podejmie je od nowa, niekonsekwentnie.
