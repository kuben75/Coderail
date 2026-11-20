---
name: start-zadania
description: Rozpoczyna nowe zadanie — tworzy gałąź, ustala zakres (scope guard), kryteria akceptacji i plan w .claude/state/. Użyj zawsze przed pierwszą zmianą w kodzie w nowym zadaniu.
argument-hint: "[T-xxx z roadmapy | krótki opis zadania]"
allowed-tools: Bash(git status*) Bash(git switch *) Bash(git branch*) Bash(git log*) Bash(mkdir -p *) Read Grep Glob
---

# Start zadania: $ARGUMENTS

## Kontekst (wstrzyknięty automatycznie)
- Gałąź: !`git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "(brak repo)"`
- Status: !`git status --short 2>/dev/null | head -20 || true`
- Aktywne zadanie: !`cat .claude/state/task.json 2>/dev/null || echo "(brak)"`

## Procedura

### 1. Sprawdź, czy można zacząć
- Jeśli jest **aktywne zadanie** (task.json istnieje) i ma niezacommitowane zmiany, zatrzymaj się. Zapytaj człowieka: dokończyć poprzednie, odłożyć je (`git stash`) czy porzucić?
- Jeśli drzewo robocze jest brudne, a zmiany nie należą do żadnego zadania, zapytaj, co z nimi zrobić. Nie stashuj ich sam.

### 2. Zrozum zadanie
- Jeśli argument to `T-xxx`, przeczytaj ten wpis w `docs/12-roadmapa.md` (cel, zależności, zakres, kryteria).
- Jeśli to opis wolny, zmapuj go na roadmapę. Gdy nie pasuje do żadnego zadania, powiedz to i zaproponuj dopisanie nowego `T-xxx`.
- Przeczytaj specyfikacje, których dotyczy zadanie (`docs/03`, `docs/04`, `docs/05`, `docs/06`). Wypisz **niejasności i sprzeczności**. Jeśli są, zadaj pytania teraz, przed planem.
- Sprawdź zależności zadania: czy zadania, od których zależy, są odhaczone w roadmapie?

### 3. Ustal zakres (scope)
Zakres to **minimalna** lista globów plików, które zadanie musi zmienić. Zwykle:
- reguła: `src/rules/<kat>/<id>.ts`, `src/rules/index.ts`, `tests/rules/<id>.test.ts`, `tests/fixtures/<id>/**`
- core: konkretne pliki w `src/core/`, odpowiadające `tests/core/**`
- zawsze dozwolone (nie wpisuj): `docs/**`, `.changeset/**`, `.claude/state/**`

Unikaj globów typu `src/**`. Szeroki scope = brak scope guarda.

### 4. Utwórz gałąź
`git switch -c <typ>/<T-xxx>-<krótki-opis-kebab>` (typ: feat/fix/refactor/perf/test/docs/build/ci/chore).

### 5. Zapisz stan
`.claude/state/task.json`:
```json
{
  "id": "T-012",
  "goal": "Reguła no-secrets: wykrywanie kluczy API w zapisywanej treści",
  "branch": "feat/T-012-rule-no-secrets",
  "scope": ["src/rules/security/no-secrets.ts", "src/rules/index.ts", "tests/rules/no-secrets.test.ts", "tests/fixtures/no-secrets/**"],
  "acceptance": [
    "5 bad / 5 good / 3 edge fixture'ów przechodzi",
    "sekret w evidence jest zredagowany",
    "p95 < 80 ms na pliku 500 linii (npm run bench)"
  ],
  "outOfScope": ["analiza entropii (T-013)"],
  "startedAt": "<ISO>"
}
```

`.claude/state/plan.md`: lista kroków z checkboxami w kolejności **test → implementacja → refaktor → docs**. Każdy krok jest weryfikowalny (komenda albo plik). Max 10 kroków. Większe zadanie zaproponuj podzielić.

### 6. Potwierdzenie
Pokaż człowiekowi zwięźle: cel, zakres (globy), kryteria, poza zakresem, plan (same tytuły kroków), pytania otwarte. **Nie zaczynaj implementacji przed jego akceptacją.** Sugeruj tryb planowania (Shift+Tab) dla zadań z więcej niż 5 krokami.

## Uwagi
- Hook `pre-edit-guard` od teraz blokuje zapis poza zakresem. Zmiana zakresu wymaga zgody człowieka (hook zapyta).
- Jedno zadanie = jedna sesja, jeśli to możliwe. Po zakończeniu: `/przekazanie` albo `/clear`.
