# CodeRail: setup projektu pod Claude Code

> **Status:** setup przed bootstrapem. To repo zawiera kompletną „infrastrukturę pracy z agentem” (zasady, skille, subagentów, hooki, dokumentację, kontrolę gita i CI), ale **jeszcze bez kodu produktu**. Kod powstaje zadanie po zadaniu z `docs/12-roadmapa.md`, zaczynając od T-001.

**CodeRail** to deterministyczny silnik barier ochronnych dla agentów AI. Zamienia reguły architektury i bezpieczeństwa z plików Markdown (które model po 15 minutach „zapomina”) w twarde blokady wpięte w hooki Claude Code i git. Gdy agent próbuje wkleić klucz API, zaimportować Prismę w komponencie React albo usunąć asercję z czerwonego testu, CodeRail blokuje zapis, tłumaczy dlaczego i podaje instrukcję naprawy. Agent poprawia się sam.

---

## Co jest w tym repo

```
.
├── CLAUDE.md                     # Indeks dla agenta (<200 linii): komendy, twarde zasady, mapa docs, skille
├── CLAUDE.local.md.example       # Wzór Twoich prywatnych preferencji (skopiuj do CLAUDE.local.md, jest w .gitignore)
├── .claude/
│   ├── settings.json             # Uprawnienia (allow/ask/deny) + rejestracja hooków
│   ├── settings.local.json.example
│   ├── hooks/                    # Deterministyczne bariery (Node, zero zależności), szczegóły: .claude/hooks/README.md
│   │   ├── session-start.mjs     #   kontekst: gałąź, status, aktywne zadanie, przypomnienie po kompaktowaniu
│   │   ├── pre-bash-guard.mjs    #   force push, --no-verify, reset --hard, .env, publish, zapis przez powłokę…
│   │   ├── pre-edit-guard.mjs    #   pliki chronione, sekrety w treści, scope guard, zaakceptowane ADR
│   │   ├── post-edit-check.mjs   #   anti-cheat (any/ts-ignore/.skip), osłabione testy, granice warstw
│   │   └── stop-verify.mjs       #   Definition of Done przed „gotowe”
│   ├── rules/                    # Zasady ładowane automatycznie wg ścieżek (paths:) — 15 plików
│   ├── skills/                   # 16 skilli = procedury (/start-zadania, /nowa-regula, /weryfikacja, /pr…)
│   └── agents/                   # 4 subagentów-recenzentów (tylko odczyt)
├── docs/                         # Pełna dokumentacja produktu i procesu (po polsku) + ADR
├── .githooks/                    # Git hooki: pre-commit, commit-msg, pre-push
├── .github/                      # CI, release, szablony PR/issue, CODEOWNERS, dependabot
├── .gitleaks.toml                # Skaner sekretów (allowlist tylko dla fixture'ów z markerem FAKE)
└── CONTRIBUTING.md, SECURITY.md, LICENSE, .editorconfig, .gitattributes, .nvmrc, .gitignore
```

## Jak zacząć (krok po kroku)

### 1. Repo i GitHub
```bash
unzip coderail.zip && cd coderail
git init -b main
git add . && git commit -m "chore: initial agent setup"
gh repo create coderail --public --source=. --push     # albo ręcznie przez github.com
```

### 2. Ochrona gałęzi na GitHubie (raz, ręcznie)
Settings → Rules → Rulesets → New branch ruleset dla `main`:
- Require a pull request before merging (u Ciebie 0 wymaganych approvali, bo pracujesz solo, ale PR obowiązkowy)
- Require status checks to pass: `verify`, `secrets`, `pr-title`
- Block force pushes, Restrict deletions, Require linear history
- Settings → General → Pull Requests: zostaw tylko **Allow squash merging**, włącz „Automatically delete head branches”

Szczegóły i uzasadnienie: `docs/10-git-workflow.md`.

### 3. Lokalnie
```bash
nvm use                         # Node 22 z .nvmrc
git config core.hooksPath .githooks   # po T-001 robi to `npm install` (skrypt prepare)
cp CLAUDE.local.md.example CLAUDE.local.md   # opcjonalnie, Twoje preferencje
```

### 4. Pierwsza sesja z Claude Code
```bash
claude
```
W sesji:
1. `/hooks`: sprawdź, że widać 5 hooków z `.claude/settings.json`
2. `/context`: sprawdź, że załadował się `CLAUDE.md` (reguły z `paths:` dojdą, gdy agent dotknie pasujących plików)
3. `/start-zadania T-001`, potem `/bootstrap`: agent stawia szkielet (package.json, tsconfig, ESLint, vitest, dependency-cruiser…) aż do zielonego `npm run verify`
4. `/commit` → `/pr` → przeglądasz PR na GitHubie → squash merge

Dalej: kolejne zadania z roadmapy według cyklu z `docs/11-praca-z-agentem.md`.

## Jak to działa: warstwy kontroli

| Warstwa | Mechanizm | Czy agent może pominąć? |
|---|---|---|
| Zasady | `CLAUDE.md`, `.claude/rules/*.md` | tak, to prośby (dlatego są krótkie i konkretne) |
| Procedury | `.claude/skills/*` | tak, ale hooki wyłapią skutki |
| Uprawnienia | `permissions` w `settings.json` | nie |
| Hooki Claude Code | `.claude/hooks/*.mjs` | nie (działają w każdym trybie uprawnień) |
| Git hooki | `.githooks/*` | lokalnie tak (`--no-verify`), ale to blokuje hook Bash |
| CI + ochrona gałęzi | `.github/workflows/*`, ruleset | nie |

Zasada: **wszystko, co da się sprawdzić maszynowo, jest hookiem, testem albo checkiem CI. Markdown zostaje dla decyzji wymagających osądu.** To jest dokładnie teza produktu CodeRail, zastosowana najpierw do budowy samego CodeRail. Od Etapu 2 projekt pilnuje sam siebie własnym narzędziem (T-030).

## Dokumentacja
Start: [`docs/README.md`](docs/README.md).
