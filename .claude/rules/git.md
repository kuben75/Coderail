# Git i GitHub (zawsze aktywne)

Pełny proces: `docs/10-git-workflow.md`.

- **Nigdy nie pracuj na `main`.** Gałęzie: `<typ>/<T-xxx>-<krótki-opis>`, np. `feat/T-012-rule-no-secrets`, `fix/T-031-tenant-scope-fp`.
- **Conventional Commits**: `<typ>(<zakres>): <opis>`, typy: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`. Zakres to warstwa lub reguła (`core`, `cli`, `rules/no-secrets`, `adapters/git`). Opis w trybie rozkazującym, ≤ 72 znaki, bez kropki. Format sprawdza hook `commit-msg` i CI.
- **Commity atomowe**: jeden logiczny krok, który się kompiluje i przechodzi testy. Test i implementacja tej samej zmiany mogą być w jednym commicie.
- **Stage'uj świadomie**: `git add <konkretne pliki>`. Nigdy `git add -A` / `git add .` bez wcześniejszego `git status` i przeglądu diffu.
- **Zabronione** (blokuje hook): `--no-verify`, force push, push/commit na `main`, `reset --hard`, `clean -f`, przepisywanie historii, tagi, `npm publish`, `gh pr merge`.
- **Każdy PR ma changeset** (`.changeset/*.md`), chyba że zmiana dotyczy wyłącznie docs/CI/testów.
- **PR**: jeden temat, opis według szablonu (`.github/pull_request_template.md`), wyniki `npm run verify` i benchmarku, jeśli dotyczy. Merge: squash, robi człowiek po review.
