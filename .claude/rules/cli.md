---
paths:
  - "src/cli/**"
---
# Warstwa CLI

CLI to cienka warstwa: parsuje argumenty, składa zależności (composition root), wywołuje core i formatuje wynik. **Zero logiki domenowej.**

## Komendy (MVP)
| Komenda | Rola |
|---|---|
| `coderail init` | wykrywa stack, generuje `coderail.config.ts`, scala hooki w `.claude/settings.json`, instaluje pre-commit |
| `coderail check [--security] [--arch] [--staged] [--files <...>] [--format text\|json]` | uruchamia reguły na plikach / staged diff; exit 0/1 |
| `coderail hook <event>` | tryb hooka Claude Code: czyta stdin, zwraca decyzję (exit 0/2 lub JSON) |
| `coderail explain <rule-id>` | wyjaśnienie reguły z przykładami bad/good (tryb nauki) |

## Kody wyjścia (kontrakt, nie zmieniaj bez ADR)
| Kod | Znaczenie |
|---|---|
| 0 | brak blokujących naruszeń |
| 1 | `check`: znaleziono naruszenia `error` |
| 2 | `hook`: blokada, powód na stderr (Claude Code przekazuje go agentowi) |
| 3 | błąd użycia lub configu |
| 4 | błąd wewnętrzny (w trybie `hook` domyślnie fail-open: exit 0 + ostrzeżenie na stderr, patrz `failMode`) |

## Zasady
- **Szybki start.** `src/cli/index.ts` importuje komendy dynamicznie (`await import('./commands/check.js')`). Komenda `hook` nie może ładować `@clack/prompts` ani kreatora `init`.
- **Jedno wyjście.** Wszystko, co trafia na terminal, przechodzi przez `output.ts`: kolory tylko gdy `process.stdout.isTTY` i brak `NO_COLOR`. Format `json` zawsze bez kolorów.
- **stdout vs stderr.** W trybie `hook`: stdout = JSON dla Claude Code, stderr = komunikat blokady (exit 2). W `check`: wynik na stdout, diagnostyka na stderr.
- **Composition root** (`composition.ts`) to jedyne miejsce, gdzie tworzy się adaptery i wstrzykuje je do core.
- **Interaktywność tylko w `init`** i tylko gdy TTY. W CI (`CI=true`) albo bez TTY: wartości domyślne albo flagi, nigdy wiszący prompt.
- Argumenty parsuje `commander`. Walidację wartości robi zod (spójne komunikaty błędów).
