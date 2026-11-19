---
name: nowa-regula
description: Procedura dodania nowej reguły CodeRail (security/architecture) metodą test-first — spec w katalogu, fixture'y bad/good/edge, test, implementacja, komunikaty, rejestracja, benchmark. Użyj, gdy zadanie polega na dodaniu reguły lub istotnej zmianie jej logiki.
argument-hint: "[rule-id]"
paths:
  - "src/rules/**"
  - "tests/rules/**"
---

# Nowa reguła: $ARGUMENTS

Przed startem musi istnieć aktywne zadanie (`/start-zadania`), a w zakresie pliki reguły, testu i fixture'ów.
Zasady jakości: `.claude/rules/reguly-produktu.md`. Format komunikatów: `.claude/rules/komunikaty.md`.

## Krok 1: Specyfikacja (zanim powstanie jakikolwiek kod)
Otwórz `docs/04-katalog-regul.md`. Jeśli reguła ma tam sekcję, przeczytaj ją uważnie. Jeśli nie ma, dopisz ją według szablonu z tego pliku:
- co łapie (precyzyjnie) i **czego świadomie NIE łapie** (granice = ochrona przed fałszywymi alarmami)
- `scope`, `events`, `needsAst`, `defaultSeverity`, opcje z domyślnymi wartościami
- min. 3 przykłady bad i 3 good

Pokaż człowiekowi sekcję „czego nie łapie” i poczekaj na akceptację, jeśli to nowa reguła.

## Krok 2: Fixture'y
Utwórz `tests/fixtures/<rule-id>/{bad,good,edge}/`. Szczegóły i nagłówki: [fixtures.md](fixtures.md).
- min. **5 bad, 5 good, 3 edge**
- good obejmuje przypadki **podobne do bad, ale poprawne** (to tam rodzą się fałszywe alarmy)
- edge: wzorzec w komentarzu, w stringu, `coderail-ignore-next-line` z powodem i bez, pusty plik, CRLF, bardzo długa linia

## Krok 3: Test (czerwony)
Utwórz `tests/rules/<rule-id>.test.ts` na wzór [szablon-testu.md](szablon-testu.md). Uruchom:
```bash
npx vitest run tests/rules/<rule-id>.test.ts
```
**Pokaż, że test jest czerwony** z właściwego powodu (brak reguły / brak naruszeń), a nie przez błąd składni.

## Krok 4: Implementacja
`src/rules/<kategoria>/<rule-id>.ts` na wzór [szablon-reguly.md](szablon-reguly.md). Kolejność detekcji: pre-filtr `includes` → regex → AST (tylko gdy konieczne). Po każdej iteracji uruchom test reguły.

## Krok 5: Komunikaty
`meta.messages.why(ctx)` i `meta.messages.fix(ctx)`. Sprawdź listą:
- [ ] Why: skutek, max 2 zdania, ≤ 220 znaków
- [ ] Fix: tryb rozkazujący, nazwy z kontekstu (plik/symbol), ≤ 400 znaków
- [ ] brak sugestii obejścia
- [ ] sekret zredagowany w `evidence`
- [ ] test sprawdza, że `fix` zawiera nazwę pliku lub symbolu

## Krok 6: Rejestracja i presety
- `src/rules/index.ts`: dodaj regułę alfabetycznie.
- Presety: dodaj do tych, w których ma sens. Domyślnie `warn`, jeśli ryzyko fałszywych alarmów jest niezerowe. Uzasadnij w PR.

## Krok 7: Wydajność
Dodaj przypadek do `tests/bench/rules.bench.ts` (plik 500 linii, który przechodzi pre-filtr). `npm run bench`, porównaj z budżetem (skill `/benchmark`). Test ReDoS: wejście 100 KB w < 50 ms.

## Krok 8: Weryfikacja i domknięcie
- `/weryfikacja`
- zaktualizuj sekcję w `docs/04-katalog-regul.md` o prawdziwe komunikaty (skopiowane z wyniku testu)
- changeset `minor` (nowa reguła) lub `patch` (poprawka)
- uruchom subagenta `recenzent-regul` na zmianach (lub `/przeglad`)

Pełna checklista do PR: [checklista.md](checklista.md).
