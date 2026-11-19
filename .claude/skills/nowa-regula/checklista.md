# Checklista nowej reguły (wklej do opisu PR)

## Specyfikacja
- [ ] sekcja w `docs/04-katalog-regul.md`: łapie / NIE łapie / opcje / przykłady
- [ ] „czego nie łapie” zaakceptowane przez człowieka

## Testy
- [ ] ≥ 5 bad, ≥ 5 good, ≥ 3 edge
- [ ] good zawiera przypadki podobne do bad, ale poprawne
- [ ] edge: komentarz, string, ignore z powodem, ignore bez powodu, CRLF, długa linia
- [ ] test był czerwony przed implementacją (wklej wynik w PR)
- [ ] test redakcji evidence (security)
- [ ] test konkretności komunikatu agenta
- [ ] test `changedLines` (scope: line)
- [ ] test ReDoS: 100 KB < 50 ms

## Implementacja
- [ ] pre-filtr przed regex/AST
- [ ] `needsAst` tylko jeśli konieczne (uzasadnienie w PR)
- [ ] brak I/O, `console`, stanu globalnego (hook arch to potwierdza)
- [ ] zarejestrowana w `src/rules/index.ts` (alfabetycznie)
- [ ] dodana do presetów (z uzasadnieniem severity)

## Jakość
- [ ] `npm run verify` zielone
- [ ] `npm run bench`: wynik vs budżet w PR
- [ ] przegląd subagenta `recenzent-regul` bez uwag krytycznych
- [ ] changeset (`minor` dla nowej reguły)
