# 02. Architektura

Styl: **hexagonal-lite / Functional Core, Imperative Shell** (ADR-0003). Czysty rdzeń z logiką decyzyjną otoczony cienką warstwą efektów ubocznych.

## Warstwy

```
                    ┌──────────────────────────────────────────┐
  terminal / CI ──► │ cli/        parsowanie argumentów,        │
  Claude Code   ──► │             composition root, output      │
  (stdin JSON)      └───────┬───────────────────────┬──────────┘
                            │                       │
                ┌───────────▼──────────┐   ┌────────▼────────┐
                │ adapters/            │   │ presets/        │
                │ claude-code, git,    │   │ dane: gotowe    │
                │ fs, config-loader,   │   │ konfiguracje    │
                │ stack-detector       │   └────────┬────────┘
                └───────────┬──────────┘            │
                            │ implementują porty    │
                ┌───────────▼───────────────────────▼────────┐
                │ core/   types, engine, config (zod), diff, │
                │         ports, errors, messages, ast/      │◄── rules/  czyste funkcje
                └────────────────────────────────────────────┘     (CheckContext) => Violation[]
```

| Warstwa | Odpowiedzialność | Zależy od | Efekty uboczne |
|---|---|---|---|
| `core` | kontrakty, silnik, schemat configu, diff, fasada AST, formatowanie komunikatu jako danych | nic (poza `zod`, parserem) | brak |
| `rules` | detekcja naruszeń | `core` | brak |
| `presets` | gotowe konfiguracje | `core`, ID reguł | brak |
| `adapters` | stdin/stdout Claude Code, git, fs, ładowanie configu, detekcja stacku | `core` | tak |
| `cli` | komendy, składanie zależności, wyjście, kody wyjścia | wszystko | tak |

Egzekwowanie: hook `post-edit-check.mjs` (natychmiast w sesji agenta), `dependency-cruiser` (`npm run arch`, CI), od Etapu 2 również reguła `layer-boundaries` samego CodeRail.

## Struktura katalogów (docelowa po MVP)
```
src/
├── index.ts                    # publiczne API: typy + defineConfig + (później) programatyczne check()
├── cli/
│   ├── index.ts                # #!/usr/bin/env node; dynamiczne importy komend
│   ├── composition.ts          # composition root: tworzy adaptery, wstrzykuje do core
│   ├── output.ts               # JEDYNE miejsce zapisu na stdout/stderr
│   └── commands/               # init.ts, check.ts, hook.ts, explain.ts
├── core/
│   ├── types.ts                # Rule, Violation, CheckContext, Config…  (publiczny kontrakt)
│   ├── engine.ts               # run(rules, contexts, config) => Result
│   ├── config.ts               # schemat zod, scalanie presetów, defineConfig
│   ├── diff.ts                 # zakresy zmienionych linii, ignore-directives
│   ├── ports.ts                # interfejsy: FileReader, GitClient, Clock…
│   ├── errors.ts               # CodeRailError + kody
│   ├── messages.ts             # składanie komunikatu (dane), redakcja
│   └── ast/                    # fasada parsera (lazy), helpery: importy, wywołania, obiekty
├── rules/
│   ├── index.ts                # rejestr reguł
│   ├── security/               # no-secrets, protected-paths, require-tenant-scope, no-sensitive-logging
│   └── architecture/           # layer-boundaries, no-ai-cheats, scope-guard
├── adapters/
│   ├── claude-code/            # hook-input.ts (zod), hook-output.ts, settings-writer.ts
│   ├── git.ts                  # staged/changed files, diff hunks, show HEAD:file
│   ├── fs.ts                   # odczyt plików w granicach projektu
│   ├── config-loader.ts        # coderail.config.{ts,mjs,json}
│   └── stack-detector.ts       # package.json, prisma/schema.prisma, next.config.*
└── presets/                    # node-api.ts, nextjs-app.ts, strict-saas.ts, index.ts
```

## Przepływ: `coderail hook pre-tool-use` (najważniejsza ścieżka)

```
Claude Code ──stdin JSON──► cli/commands/hook.ts
                              │ 1. adapters/claude-code/hook-input: parse + walidacja (zod)
                              │    → HookEvent { event, tool, filePath, proposedContent?, command? }
                              │ 2. adapters/config-loader: config (cache w pamięci procesu)
                              │ 3. adapters/fs (+ git): bieżąca treść pliku; dla Edit symulacja wyniku
                              │ 4. core/diff: changedLines = linie różne między bieżącą a proponowaną treścią
                              │ 5. core/engine: reguły aktywne dla event + pliku → Violation[]
                              │ 6. core/messages: Violation[] → BlockDecision (dane)
                              ▼ 7. adapters/claude-code/hook-output + cli/output:
                       exit 0 (pusto)          ← brak blokujących naruszeń
                       exit 2 + stderr (why/fix) ← blokada, agent dostaje komunikat
                       exit 0 + stderr warn       ← błąd wewnętrzny przy failMode=open
```

Ścieżka `check --staged` (pre-commit/CI) używa tego samego silnika. Różni się tylko adapterem wejścia (git zamiast stdin) i wyjściem (raport, exit 0/1).

## Kluczowe decyzje
| Decyzja | Gdzie |
|---|---|
| Parser AST: TypeScript Compiler API vs oxc-parser (lazy w obu przypadkach) | ADR-0001 (Proponowany, rozstrzyga benchmark w T-011) |
| Zero LLM i zero sieci w runtime | ADR-0002 |
| Hexagonal-lite, porty w core | ADR-0003 |
| Fail-open domyślnie w trybie hook, `failMode: 'closed'` opcjonalnie | ADR-0004 |
| Język: kod i komunikaty EN, dokumentacja PL | ADR-0005 |
| Diff-aware jako domyślny tryb reguł | ADR-0006 |

## Bezpieczeństwo (model zagrożeń)
**Zasoby**: sekrety użytkownika, integralność repo, zaufanie do blokad.
**Niezaufane wejście**: payload Claude Code (treść wygenerowana przez model, który mógł zostać zmanipulowany treścią czytanych plików, czyli prompt injection), ścieżki, zawartość repo, wzorce z configu.

| Zagrożenie | Mitigacja |
|---|---|
| wstrzyknięcie komend przez ścieżkę | tylko `execFile('git', [..., '--', path])`, brak powłoki |
| path traversal (`../../`) | normalizacja + wymóg „wewnątrz projektu”, ignorowanie symlinków na zewnątrz |
| ReDoS (wzorce wbudowane i z configu) | brak zagnieżdżonych kwantyfikatorów, limit długości wzorca/wejścia, testy czasu |
| wyciek sekretu przez komunikat (stderr trafia do modelu i logów) | redakcja w `core/messages.ts`, testy, że pełna wartość nie pojawia się w żadnym wyjściu |
| obejście blokady celowym crashem | crash reguły izolowany przez silnik; pozostałe reguły nadal blokują; fail-open tylko dla crashu całego procesu |
| obejście przez inne narzędzie (Bash `>`/`sed -i`) | `post-tool-use` + `stop` + `pre-commit` sprawdzają stan plików niezależnie od narzędzia; reguła `no-ai-cheats` patrzy na diff |
| wykonanie kodu z repo | wykonujemy wyłącznie jawny plik configu |

Poza modelem: człowiek świadomie wyłączający hooki w swoim terminalu.
