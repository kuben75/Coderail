# Jak współtworzyć CodeRail

Projekt powstaje w ścisłej współpracy człowiek + Claude Code. Te same zasady obowiązują ludzi i agentów.

## Wymagania
- Node 22+ (`nvm use`), git, opcjonalnie `gh` i `gitleaks`
- `npm install` ustawia git hooki (`core.hooksPath=.githooks`)

## Cykl zmiany
1. Issue lub zadanie z `docs/12-roadmapa.md` (`T-xxx`)
2. Gałąź `<typ>/<T-xxx>-<opis>` z `main`
3. Test najpierw (dla reguł: fixture'y `bad/good/edge`, patrz `docs/08-testowanie.md`)
4. `npm run verify` zielone
5. Changeset: `npx changeset` (dla zmian w `src/`)
6. PR według szablonu, tytuł w Conventional Commits, squash merge po review

## Zgłaszanie fałszywego alarmu
Szablon issue „False positive”: minimalny fragment kodu, ID reguły, oczekiwane zachowanie. Każdy potwierdzony FP staje się fixture'em `good/`.

## Zasady
- Precyzja reguł > pokrycie. Fałszywy alarm to bug wysokiego priorytetu.
- Wydajność to wymaganie: budżety w `docs/09-wydajnosc.md`.
- Bez nowych zależności runtime bez dyskusji w issue.
- Kod i komunikaty CLI po angielsku, dokumentacja projektu po polsku (ADR-0005).
