---
name: falszywy-alarm
description: Naprawa fałszywego alarmu (false positive) lub przeoczenia (false negative) reguły CodeRail — najpierw fixture odtwarzający problem, potem minimalna poprawka bez osłabiania istniejących przypadków. Użyj, gdy reguła zgłasza poprawny kod albo nie łapie złego.
argument-hint: "[rule-id] [opis lub ścieżka do przykładu]"
---

# Fałszywy alarm / przeoczenie: $ARGUMENTS

Zasada nadrzędna: **żaden istniejący fixture `bad/` nie może przestać być wykrywany**, a żaden `good/` nie może zacząć być zgłaszany. Poprawka, która naprawia jeden przypadek kosztem innego, to regres.

## 1. Klasyfikacja
- **FP** (false positive): reguła zgłasza poprawny kod → nowy plik w `good/` (lub `edge/`).
- **FN** (false negative): reguła przepuszcza zły kod → nowy plik w `bad/`.
- **Nie-błąd**: kod faktycznie łamie regułę, a użytkownik chce wyjątku. To nie poprawka reguły. Wskaż `coderail-ignore-next-line <id> -- <powód>` albo opcję configu. Zakończ.

Jeśli nie masz pewności, która to klasa, zapytaj człowieka. Granice reguły definiuje sekcja „czego NIE łapie” w `docs/04-katalog-regul.md`.

## 2. Reprodukcja (czerwony test)
1. Zminimalizuj przykład do najmniejszego pliku, który nadal odtwarza problem. Usuń kod niezwiązany z problemem i zanonimizuj nazwy.
2. Zapisz go jako fixture z opisową nazwą, np. `good/prisma-findmany-with-tenant-in-spread.ts`, z nagłówkiem `// why-good:` / `// expect:`.
3. `npx vitest run tests/rules/<id>.test.ts`. Nowy przypadek MUSI być czerwony. Wklej wynik.

## 3. Analiza przyczyny
Zanim zmienisz kod, nazwij przyczynę jednym zdaniem, np. „regex nie uwzględnia spread operatora w obiekcie `where`”. Typowe przyczyny:
- regex zbyt szeroki lub zbyt wąski
- brak rozróżnienia komentarz / string / kod
- detekcja na poziomie tekstu tam, gdzie potrzebny jest AST (albo odwrotnie)
- brak obsługi aliasu importu / re-eksportu
- błąd w `changedLines` (diff)

Jeśli poprawka wymaga zmiany granic reguły (spec), zatrzymaj się i zapytaj człowieka. To zmiana produktu, nie bugfix.

## 4. Minimalna poprawka
- Zmieniaj tylko logikę reguły. Nie dotykaj istniejących fixture'ów ani asercji (hook `post-edit-check` pilnuje osłabiania testów).
- Po zmianie uruchom **cały** test reguły i testy core: `npx vitest run tests/rules/<id>.test.ts tests/core`.
- Jeśli poprawka dodaje AST lub nowy regex, uruchom `npm run bench` i test ReDoS.

## 5. Domknięcie
- `docs/04-katalog-regul.md`: dopisz przypadek do „łapie” lub „nie łapie”, jeśli doprecyzowuje granice.
- changeset `patch`: `fix(rules/<id>): <czego dotyczył FP/FN>`
- `/weryfikacja`
