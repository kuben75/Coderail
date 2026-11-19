# ADR-0006: Reguły diff-aware jako tryb domyślny

**Status:** Proponowany
**Data:** 2026-11-19
**Zastępuje:** —

## Kontekst
Użytkownik wpina CodeRail w istniejące repo z setkami historycznych naruszeń. Jeśli hook zgłasza wszystkie naruszenia w pliku, każdy zapis agenta w starym pliku jest blokowany za kod, którego agent nie napisał. Agent zaczyna „naprawiać” cały plik (zmiany poza zakresem), a użytkownik wyłącza narzędzie.

## Rozważane opcje
### Opcja A: cały plik
- ➖ blokady za stary kod, zmiany poza zakresem, wyłączenie narzędzia

### Opcja B: baseline file (jak w niektórych linterach): zapis wszystkich istniejących naruszeń
- ➕ działa też dla reguł plikowych
- ➖ plik baseline do utrzymania, konflikty, nieczytelne diffy

### Opcja C: diff-aware: raport tylko w zmienionych liniach (`changedLines`)
- ➕ zero konfiguracji, naturalne dla pętli agenta (Edit = zmienione linie)
- ➖ reguły plikowe / changeset wymagają porównania przed/po (liczności), nie linii

## Decyzja
Opcja C jako domyślna. Reguły `scope: 'line'` filtrują po `changedLines`; reguły `file`/`changeset` porównują stan przed i po (np. liczba asercji, nowe importy). `coderail check --all` pozwala zobaczyć pełny stan repo (audyt), bez wpływu na hooki.

## Konsekwencje
- `core/diff.ts` jest krytyczny i ma najwyższe pokrycie
- każda reguła ma test „naruszenie poza changedLines nie jest raportowane”

## Weryfikacja
Na własnym projekcie autora z historycznym kodem: zero blokad za niezmienione linie przez 2 tygodnie.

## Dla autora: czego uczy ta decyzja
Narzędzia jakości wdraża się inkrementalnie („clean as you code”). Wymaganie naprawy całego długu technicznego od razu to najszybsza droga do odrzucenia narzędzia.
