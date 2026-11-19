---
name: przekazanie
description: Zapisuje notatkę przekazania na koniec sesji (co zrobiono, stan, następny krok, otwarte pytania) w .claude/state/handoff.md, żeby kolejna sesja po /clear zaczęła bez utraty kontekstu. Użyj przed /clear, przed przerwą lub gdy kontekst robi się długi.
---

# Przekazanie sesji

## Kontekst
- Zadanie: !`cat .claude/state/task.json 2>/dev/null || echo "(brak)"`
- Plan: !`cat .claude/state/plan.md 2>/dev/null || echo "(brak)"`
- Status: !`git status --short 2>/dev/null || true`
- Commity na gałęzi: !`git log --oneline main..HEAD 2>/dev/null || true`

## Zapisz `.claude/state/handoff.md` (nadpisz poprzedni)
```markdown
# Przekazanie: <T-xxx> (<data>)
## Zrobione
- … (z odniesieniem do plików/commitów)
## Stan
- testy: <zielone/czerwone, które>
- niezacommitowane: <lista lub "brak">
## Następny krok (jeden, konkretny)
- …
## Otwarte pytania do człowieka
- …
## Pułapki odkryte w tej sesji
- … (np. „vitest --changed nie widzi plików nieśledzonych, trzeba je dodać do stage”)
```
Zaktualizuj też checkboxy w `.claude/state/plan.md`.

Pułapki, które dotyczą całego projektu, a nie tylko tego zadania, zaproponuj człowiekowi jako dopisek do odpowiedniego pliku w `.claude/rules/` lub `docs/`. Nie dopisuj sam.

Na koniec powiedz człowiekowi: „Możesz teraz zrobić /clear. Nowa sesja dostanie stan z hooka SessionStart, a handoff jest w .claude/state/handoff.md”.
