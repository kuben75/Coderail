# Zasady pracy (zawsze aktywne)

## Cykl każdego zadania
1. **Bez aktywnego zadania nie ma zmian w kodzie.** Najpierw `/start-zadania`: gałąź, zakres, kryteria akceptacji i plan w `.claude/state/`.
2. **Najpierw zrozum, potem pisz.** Przeczytaj powiązaną specyfikację w `docs/` (katalog reguł, kontrakty, architektura). Jeśli spec jest niejasny albo sprzeczny z kodem, zatrzymaj się i zapytaj. Nie zgaduj.
3. **Test najpierw.** Zmiana zachowania zaczyna się od testu albo fixture'a, który teraz NIE przechodzi. Uruchom go i pokaż, że jest czerwony. Dopiero potem implementacja.
4. **Małe kroki.** Po każdym logicznym kroku uruchom `npm run verify:fast`. Nie kumuluj 10 plików zmian bez uruchomienia testów.
5. **Przed „gotowe”** uruchom `/weryfikacja`. Hook `Stop` i tak sprawdzi Definition of Done.
6. **Commit tylko przez `/commit`, PR tylko przez `/pr`.** Merge i release robi człowiek.

## Zakres
- Zmieniaj tylko pliki z zakresu zadania (`.claude/state/task.json`). Pilnuje tego hook scope guard.
- Pomysły „przy okazji” (refaktor, literówka obok, lepsza nazwa) zapisuj w `.claude/state/followups.md`. Nie realizuj ich w bieżącym zadaniu.
- Nie zmieniaj publicznego API (typy w `src/core/types.ts`, schemat configu, kody wyjścia, format komunikatów), jeśli zadanie tego wprost nie obejmuje.

## Uczciwość wobec człowieka
- Nigdy nie ogłaszaj sukcesu bez dowodu. W podsumowaniu podaj komendy, które uruchomiłeś, i ich wynik.
- Jeśli czegoś nie zrobiłeś, nie zweryfikowałeś albo obszedłeś, napisz to wprost w pierwszym akapicie podsumowania.
- Gdy hook blokuje słuszną zmianę, **nie obchodź go** (inna ścieżka, inny tool, rozbicie zapisu, `Bash` zamiast `Edit`). Zatrzymaj się i opisz człowiekowi: hook, plik, komunikat, dlaczego uważasz, że to fałszywy alarm.
- Gdy test nie przechodzi, a uważasz, że to test jest błędny, nie zmieniaj go sam. Przedstaw argument i poczekaj.

## Kiedy pytać, a kiedy działać
- **Pytaj** przed: nową zależnością, zmianą publicznego API lub schematu configu, zmianą wydajnościowego budżetu, usunięciem testu, każdą decyzją architektoniczną bez ADR.
- **Działaj bez pytania**: implementacja zgodna ze specyfikacją, nowe testy, poprawki błędów wskazanych przez hooki, typecheck i lint.

## Język
- Kod, identyfikatory, nazwy plików w `src/` i `tests/`, ID reguł oraz komunikaty CLI piszemy **po angielsku** (produkt globalny, patrz ADR-0005).
- Dokumentacja projektu (`docs/`), komentarze wyjaśniające decyzje, opisy PR i rozmowa z człowiekiem są **po polsku**.
- Commity: Conventional Commits, typ po angielsku (`feat`, `fix`…), opis po polsku lub angielsku, ale spójnie w obrębie PR.
