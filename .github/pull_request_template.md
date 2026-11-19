<!-- Tytuł PR = Conventional Commits, np. feat(rules/no-secrets): detect hardcoded API keys -->

## Cel
Zadanie: T-xxx — <cel jednym zdaniem>

## Zmiany
- `ścieżka` — co i dlaczego

## Dowody weryfikacji
```
npm run verify → ✅ (typecheck, lint, format, arch, test N/N, pokrycie core X%, knip, build, publint/attw, e2e)
```
- Kryteria akceptacji: 1. … — dowód: <test/komenda/plik>
- Test był czerwony przed zmianą: <nazwa testu / wklejony wynik>

## Wydajność (jeśli dotyczy core, reguł z AST, ścieżki hooka)
| Scenariusz | main p95 | ta gałąź p95 | budżet |
|---|---|---|---|

## Decyzje i alternatywy
<ADR? Co odrzucono i dlaczego? / nie dotyczy>

## Ryzyka, czego nie zweryfikowano
<wprost / brak>

## Follow-upy
<z .claude/state/followups.md / brak>

## Checklista
- [ ] zmiany tylko w zakresie zadania
- [ ] test-first; żaden istniejący test/fixture nie został osłabiony
- [ ] dokumentacja zaktualizowana (`docs/…`)
- [ ] changeset (lub `--empty` z uzasadnieniem)
- [ ] przegląd subagentów (`/przeglad`) bez blokujących uwag
- [ ] (reguła) checklista z `.claude/skills/nowa-regula/checklista.md`
