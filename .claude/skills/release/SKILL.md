---
name: release
description: Przygotowanie wydania CodeRail — przegląd changesetów, kontrola gotowości (CI, benchmark, e2e, dokumentacja), szkic notatek wydania. Agent przygotowuje, człowiek wydaje (merge PR "Version Packages" uruchamia publikację w CI). Wywoływany przez człowieka.
disable-model-invocation: true
allowed-tools: Bash(npx changeset status*) Bash(git log*) Bash(gh run list*) Bash(gh pr list*) Read Grep Glob
---

# Przygotowanie wydania

## Kontekst
- Changesety: !`npx changeset status --verbose 2>/dev/null || echo "(changesets niezainstalowane)"`
- Ostatnie tagi: !`git tag --sort=-creatordate | head -5 2>/dev/null || true`
- Ostatnie przebiegi CI na main: !`gh run list --branch main --limit 5 2>/dev/null || echo "(gh niedostępne)"`

## Proces (docs/10-git-workflow.md → Release)
1. Każdy merge do `main` z changesetem powoduje, że workflow `release.yml` otwiera lub aktualizuje PR **„Version Packages”** (bump wersji + CHANGELOG).
2. **Merge tego PR robi człowiek.** Workflow publikuje wtedy paczkę na npm (z provenance) i tworzy tag oraz GitHub Release.
3. Agent nigdy nie publikuje, nie taguje i nie merguje (blokują to hooki i uprawnienia).

## Twoje zadanie (agenta): checklista gotowości
- [ ] CI na `main` zielone (ostatni przebieg)
- [ ] changesety mają poprawny typ (`major`/`minor`/`patch`). W 0.x zmiana łamiąca = `minor` z sekcją **BREAKING** w opisie.
- [ ] `docs/` odpowiada zachowaniu (komendy, opcje, reguły, kody wyjścia)
- [ ] README: sekcja Quick start działa na czystym repo (sprawdź `/test-hooka` lub ostatni raport e2e w `docs/raporty/`)
- [ ] benchmark na `main` mieści się w budżetach
- [ ] brak otwartych issue z etykietą `release-blocker`

## Notatki wydania (szkic dla człowieka)
```
## coderail vX.Y.Z
### Highlights (1–3 punkty, język korzyści dla użytkownika)
### New rules / Changes / Fixes
### Breaking changes (z instrukcją migracji)
### Performance (hook p95: przed → po)
```
Zakończ informacją: „Gotowe do wydania: zmerguj PR Version Packages” albo listą blokerów.
