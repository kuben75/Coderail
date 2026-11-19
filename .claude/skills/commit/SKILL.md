---
name: commit
description: Tworzy atomowy commit w formacie Conventional Commits po przeglądzie diffu — świadomy staging konkretnych plików, kontrola zakresu i sekretów. Wywoływany przez człowieka.
disable-model-invocation: true
argument-hint: "[opcjonalna podpowiedź treści]"
allowed-tools: Bash(git status*) Bash(git diff*) Bash(git add *) Bash(git log*) Read
---

# Commit

## Kontekst
- Gałąź: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || true`
- Status: !`git status --short 2>/dev/null || true`
- Ostatnie commity (styl): !`git log --oneline -8 2>/dev/null || true`
- Zadanie: !`cat .claude/state/task.json 2>/dev/null || echo "(brak)"`

## Procedura
1. **Gałąź**: jeśli `main`/`master`, przerwij i każ uruchomić `/start-zadania`.
2. **Przegląd**: `git diff` (oraz `git diff --staged`, jeśli coś jest już w stage). Szukaj rzeczy, które nie powinny trafić do commita:
   - pliki spoza zakresu zadania
   - debug (`console.log`, `debugger`), zakomentowany kod, pliki tymczasowe
   - sekrety, nawet fałszywe poza `tests/fixtures/`
   - zmiany formatowania niezwiązane z zadaniem
   Znalezione problemy zgłoś i NIE commituj, dopóki człowiek nie zdecyduje.
3. **Podział**: jeśli diff zawiera więcej niż jedną logiczną zmianę (np. refaktor i feature), zaproponuj kilka commitów i kolejność.
4. **Stage**: `git add <konkretne ścieżki>`. Nigdy `git add -A` ani `git add .`.
5. **Wiadomość**:
   ```
   <typ>(<zakres>): <opis w trybie rozkazującym, ≤72 znaki, bez kropki>

   <opcjonalnie: DLACZEGO, nie CO — 1–3 linie, zawijane na 72>

   Refs: T-xxx
   ```
   Typy: `feat` `fix` `refactor` `perf` `test` `docs` `build` `ci` `chore`. Zmiana łamiąca: `!` po zakresie i stopka `BREAKING CHANGE: …`.
6. Pokaż człowiekowi listę plików i wiadomość. Commit wykonaj po akceptacji (uprawnienia i tak o nią zapytają):
   `git commit -m "<tytuł>" -m "<treść>"`
7. Jeśli hook `pre-commit` lub `commit-msg` odrzuci commit, napraw przyczynę i utwórz commit ponownie. Nigdy `--no-verify`, nigdy `--amend` na commitach już wypchniętych.
