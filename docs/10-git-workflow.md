# 10. Git workflow

Model: **trunk-based z krótkimi gałęziami + PR + squash merge**. Solo developer, ale z dyscypliną zespołu: PR jest punktem kontrolnym dla człowieka nad pracą agenta.

## Gałęzie
- `main`: zawsze zielony, zawsze wydawalny. Chroniony rulesetem (poniżej).
- `<typ>/<T-xxx>-<krótki-opis>`, np. `feat/T-012-rule-no-secrets`, `fix/T-031-tenant-scope-spread-fp`, `docs/T-005-catalog`.
- Gałąź żyje max kilka dni. Większe zadanie dzielimy w roadmapie.

## Commity: Conventional Commits
```
<typ>(<zakres>)<!>: <opis ≤72 znaki, tryb rozkazujący, bez kropki>

<treść: DLACZEGO, zawijana na 72>

Refs: T-xxx
BREAKING CHANGE: <opis, jeśli dotyczy>
```
| Typ | Kiedy | Wpływ na wersję (przez changeset) |
|---|---|---|
| `feat` | nowa funkcja, reguła, opcja | minor |
| `fix` | poprawka błędu, FP/FN reguły | patch |
| `perf` | wydajność bez zmiany zachowania | patch |
| `refactor` | zmiana struktury bez zmiany zachowania | — |
| `test` | tylko testy/fixture'y | — |
| `docs` | tylko dokumentacja | — |
| `build` / `ci` / `chore` | build, CI, porządki | — |

Zakresy: `core`, `cli`, `adapters/<nazwa>`, `rules/<id>`, `presets`, `deps`, `repo`.
Walidacja: git hook `commit-msg` (lokalnie) + job `pr-title` (tytuł PR = tytuł squash-commita).

## Changesets (wersjonowanie i CHANGELOG)
Każdy PR zmieniający zachowanie paczki ma plik `.changeset/<nazwa>.md`:
```md
---
"coderail": minor
---

Add `no-secrets` rule detecting hardcoded API keys (Anthropic, OpenAI, AWS, Stripe, GitHub) with redacted evidence.
```
- treść po angielsku (trafia do CHANGELOG dla użytkowników npm)
- w 0.x: zmiana łamiąca = `minor` + akapit `**BREAKING:**`
- zmiany wewnętrzne bez wpływu na użytkownika: `npx changeset add --empty`

## Pull Request
- tworzy agent skillem `/pr`, merguje **tylko człowiek** (squash), po zielonym CI
- szablon: `.github/pull_request_template.md`
- jeden temat na PR. Duże PR (> 600 linii bez fixture'ów) dzielimy

## Kontrole: gdzie co działa
| Kontrola | Hook Claude Code | git pre-commit | git commit-msg | git pre-push | CI |
|---|---|---|---|---|---|
| sekrety | ✓ (treść zapisu) | ✓ (staged, gitleaks jeśli zainstalowany + wzorce) | | | ✓ gitleaks |
| zakaz pracy na main | ✓ | ✓ | | ✓ | ruleset |
| format commita | | | ✓ | | ✓ (tytuł PR) |
| typecheck + lint + arch + testy | ✓ (Stop: `verify:fast`) | ✓ (`verify:fast`) | | ✓ (`verify`) | ✓ |
| pokrycie, knip, build, publint, e2e | | | | ✓ | ✓ |
| benchmark | | | | | ✓ (komentarz na PR) |
| audyt zależności | | | | | ✓ `npm audit` |

## CI (`.github/workflows/ci.yml`)
Joby: `verify` (Node 22 i 24, `npm ci` → `npm run verify`), `secrets` (gitleaks), `pr-title` (Conventional Commits), `bench` (tylko PR, raport), `audit` (`npm audit --omit=dev --audit-level=high`). Joby zależne od `package.json` są pomijane, dopóki T-001 go nie utworzy.

## Release (`.github/workflows/release.yml`)
1. merge PR z changesetami → workflow otwiera lub aktualizuje PR **„chore: version packages”**
2. człowiek przegląda bump i CHANGELOG, merguje
3. workflow publikuje na npm z **provenance** (`id-token: write`), tworzy tag i GitHub Release
Wymaga sekretu `NPM_TOKEN` (granular, publish tylko dla tego pakietu) albo skonfigurowanego **npm Trusted Publishing** dla repo (preferowane, bez długożyjącego tokenu).

## Ochrona gałęzi `main` (ruleset, raz ręcznie)
- Require a pull request (0 approvals przy pracy solo, PR obowiązkowy)
- Require status checks: `verify (22)`, `verify (24)`, `secrets`, `pr-title`
- Require linear history, Block force pushes, Restrict deletions
- Merge: tylko squash; automatycznie usuwaj gałęzie po merge
- (Opcjonalnie) Require signed commits

## Czego agent nie robi nigdy
force push, push na main, `--no-verify`, `reset --hard`, przepisywanie historii, tagi, publikacja, merge PR, zmiany ustawień repo. Blokady: `.claude/hooks/pre-bash-guard.mjs` + `permissions.deny` w `.claude/settings.json`.
