# Hooki Claude Code w tym repozytorium

Hooki to **deterministyczne bariery** dla agenta. Reguły w `.claude/rules/` i `CLAUDE.md` to dla modelu tylko prośby. Hooki są wykonywane zawsze i agent nie może ich pominąć. Agent **nie może ich edytować**: blokują to zarówno uprawnienia w `settings.json`, jak i `pre-edit-guard.mjs`. Zmienia je tylko człowiek.

## Mapa

| Plik | Zdarzenie | Co robi | Budżet |
|---|---|---|---|
| `session-start.mjs` | `SessionStart` (startup/resume/clear/compact) | Wstrzykuje gałąź, status gita, aktywne zadanie, a po kompaktowaniu przypomina twarde zasady | < 100 ms |
| `pre-bash-guard.mjs` | `PreToolUse` → `Bash` | Blokuje force push, push/commit na main, `--no-verify`, `reset --hard`, publikację, odczyt `.env`, `curl \| sh`. Pyta przy nowych zależnościach | < 50 ms |
| `pre-edit-guard.mjs` | `PreToolUse` → `Edit\|Write\|MultiEdit\|NotebookEdit` | Pliki zakazane (.env, klucze), chronione (hooki, settings, lockfile, CI, snapshoty, zaakceptowane ADR), sekrety w treści, **scope guard** | < 50 ms |
| `post-edit-check.mjs` | `PostToolUse` → `Edit\|Write\|MultiEdit` | Anti-cheat (`@ts-ignore`, `any`, `.only/.skip`, `eslint-disable`), osłabione testy, **granice warstw**, `console`/`process.exit` poza CLI | < 150 ms |
| `stop-verify.mjs` | `Stop` | Definition of Done: `npm run verify:fast`, reguła ma testy, fixture'y i wpis w katalogu, jest changeset. Ma cache odcisku drzewa, więc nie powtarza weryfikacji bez zmian | < 170 s |
| `lib/common.mjs` | — | I/O hooków, glob → regex, git bez powłoki, format komunikatów | — |

## Kontrakt komunikatów

Każda blokada ma format zgodny z `docs/07-komunikaty.md`:

```
[kategoria/id] ścieżka:linia
DLACZEGO: jedno-dwa zdania dla człowieka (uczysz się architektury na żywym kodzie)
NAPRAW: konkretna dyrektywa dla agenta (co zrobić, gdzie, jak)
```

## Zasady pisania hooków (dla człowieka)

1. **Zero zależności npm.** Tylko wbudowane moduły Node 22+. Hook startuje przy każdym wywołaniu narzędzia.
2. **Git przez `execFileSync`, nigdy przez powłokę.** Ścieżki plików pochodzą od modelu, więc trzeba wykluczyć wstrzyknięcie komend.
3. **Fail-open przy błędzie wewnętrznym** (`failOpen`). Zepsuty hook nie może zablokować całej sesji. Wyjątek: jeśli dodasz hook, którego ominięcie grozi wyciekiem, rozważ fail-closed i opisz to w ADR.
4. **Diff-aware.** Liczymy tylko *nowe* wystąpienia wzorców (przed i po). Stary kod nie generuje fałszywych alarmów.
5. **Regexy bez zagnieżdżonych kwantyfikatorów** (ReDoS). Każdy nowy wzorzec przetestuj na złośliwie długim wejściu.
6. **Odpowiedź JSON albo exit 2, nigdy oba naraz.** Tu zawsze JSON i exit 0 (`denyPreToolUse`, `blockWithReason`).
7. **`stop_hook_active`** musi zawsze przepuszczać. Inaczej powstaje pętla.

## Jak testować hooki

```bash
export CLAUDE_PROJECT_DIR="$PWD"

# Bash guard
echo '{"tool_input":{"command":"git push --force origin feat/x"}}' | node .claude/hooks/pre-bash-guard.mjs

# Edit guard (sekret w treści)
echo '{"tool_name":"Write","tool_input":{"file_path":"src/a.ts","content":"const k=\"sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123\""}}' \
  | node .claude/hooks/pre-edit-guard.mjs

# Post-edit (plik musi istnieć na dysku — hook czyta go po zapisie)
echo '{"tool_name":"Write","tool_input":{"file_path":"src/core/engine.ts","content":"import fs from \"node:fs\""}}' \
  | node .claude/hooks/post-edit-check.mjs

# Stop
echo '{}' | node .claude/hooks/stop-verify.mjs
```

Pusta odpowiedź oznacza, że hook przepuszcza. JSON z `deny` / `ask` / `block` oznacza decyzję.

Debug na żywo: `claude --debug-file /tmp/claude.log`, potem `tail -f /tmp/claude.log`. W sesji: `/hooks` pokazuje zarejestrowane hooki.

## Docelowo

Od Etapu 2 roadmapy `post-edit-check.mjs` i część `pre-edit-guard.mjs` zastępuje sam CodeRail (`coderail hook pre-tool-use` / `post-tool-use`). Projekt pilnuje wtedy sam siebie własnym narzędziem (dogfooding). Migracja to zadanie T-030 w `docs/12-roadmapa.md`.
