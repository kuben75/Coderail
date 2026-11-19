---
name: pr
description: Wypycha gałąź zadania i otwiera Pull Request na GitHubie z opisem według szablonu (cel, zmiany, dowody weryfikacji, benchmark, ryzyka), po czym zamyka zadanie w .claude/state. Wywoływany przez człowieka.
disable-model-invocation: true
allowed-tools: Bash(git status*) Bash(git diff*) Bash(git log*) Bash(gh pr view*) Bash(gh pr checks*) Read
---

# Pull Request

## Kontekst
- Gałąź: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
- Commity na gałęzi: !`git log --oneline main..HEAD 2>/dev/null || true`
- Diff stat: !`git diff --stat main...HEAD 2>/dev/null | tail -25 || true`
- Niezacommitowane: !`git status --short 2>/dev/null || true`
- Zadanie: !`cat .claude/state/task.json 2>/dev/null || echo "(brak)"`
- Changesety: !`ls .changeset/*.md 2>/dev/null | grep -v README || echo "(brak)"`

## Warunki wstępne (jeśli któryś niespełniony, przerwij i powiedz, co brakuje)
- [ ] brak niezacommitowanych zmian
- [ ] `/weryfikacja` wykonana w tej sesji po ostatniej zmianie (albo uruchom `npm run verify` teraz)
- [ ] `/przeglad` bez blokujących uwag
- [ ] changeset istnieje (dla zmian w `src/`)

## Procedura
1. **Tytuł PR** = tytuł w formacie Conventional Commits (będzie tytułem squash-commita, CI go sprawdza): `feat(rules/no-secrets): detect hardcoded API keys`.
2. **Opis** wypełnij według `.github/pull_request_template.md`. Każdą sekcję wypełnij konkretami albo napisz „nie dotyczy”:
   - Cel i link do zadania (`T-xxx`)
   - Co się zmieniło (punkty, ze ścieżkami)
   - Dowody: wynik `npm run verify`, liczba testów, pokrycie, benchmark vs budżet
   - Decyzje i alternatywy (jeśli były)
   - Ryzyka, czego nie zweryfikowano, follow-upy (z `followups.md`)
   - Checklista (dla reguł wklej `nowa-regula/checklista.md`)
3. **Push**: `git push -u origin <gałąź>` (uprawnienia zapytają człowieka).
4. **Utworzenie**: `gh pr create --base main --title "<tytuł>" --body-file <plik tymczasowy w .claude/state/pr-body.md>`.
5. **Zamknięcie zadania**: ustaw `"status": "done"` w `.claude/state/task.json` (Edit, bez zmiany `id` i `scope`). Scope guard przestaje wtedy obowiązywać.
6. Podaj link do PR i przypomnij: merge (squash) robi człowiek po review i zielonym CI. Agent nie merguje.

## Po review
Uwagi z review: wróć na gałąź, nowe commity (bez przepisywania historii), `git push`. Odpowiedz na uwagi w podsumowaniu dla człowieka.
