# 05. Integracja z Claude Code

Źródło prawdy o hookach: oficjalna dokumentacja Claude Code (`code.claude.com/docs/en/hooks` i `/hooks-guide`). Ten dokument opisuje, **jak CodeRail z niej korzysta**. Przy zadaniach T-020/T-021 zweryfikuj każdy szczegół z aktualną wersją dokumentacji: API hooków się rozwija. Rozbieżność zapisz tutaj w tym samym PR.

## Fakty o hookach, na których się opieramy
- Hook typu `command` dostaje JSON na **stdin**. Wspólne pola: `session_id`, `transcript_path`, `cwd`, `hook_event_name`. Dla zdarzeń narzędzi: `tool_name`, `tool_input` (dla `PostToolUse` także wynik narzędzia).
- `tool_input` dla `Write`: `file_path`, `content`. Dla `Edit`: `file_path`, `old_string`, `new_string`, `replace_all?`. Dla `Bash`: `command`.
- **Exit 0** = brak sprzeciwu. **Exit 2** = blokada, a stderr trafia do Claude jako informacja zwrotna (dla `PreToolUse`, `PostToolUse`, `Stop`). Inny kod = błąd niblokujący (dla większości zdarzeń).
- Zamiast kodów można zwrócić **JSON na stdout przy exit 0**:
  - `PreToolUse`: `{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny"|"ask"|"allow","permissionDecisionReason":"…"}}`
  - `PostToolUse` / `Stop`: `{"decision":"block","reason":"…"}`
  - kontekst bez blokady: `hookSpecificOutput.additionalContext` (pole musi być w `hookSpecificOutput`, na najwyższym poziomie jest po cichu ignorowane)
  - jeden mechanizm na hook: albo exit 2 + stderr, albo exit 0 + JSON
- `PreToolUse` uruchamia się **przed** sprawdzeniem uprawnień i w każdym trybie, także `bypassPermissions`. `deny` z hooka blokuje zawsze.
- Przy kilku hookach na to samo zdarzenie wygrywa najbardziej restrykcyjna decyzja (`deny` > `defer` > `ask` > `allow`).
- `Stop` z `stop_hook_active: true` oznacza, że hook już raz wymusił kontynuację. Trzeba przepuścić, inaczej powstaje pętla (Claude Code i tak nadpisze hook po kilku blokadach z rzędu).
- Matchery są wrażliwe na wielkość liter (`Edit|Write`). Pole `if` (składnia reguł uprawnień, np. `Edit(*.ts)`) pozwala nie uruchamiać procesu dla nieistotnych plików.
- Ścieżka do skryptu: `"$CLAUDE_PROJECT_DIR"/…`. Domyślny timeout hooka command: 10 min (ustawiamy własny, krótki).

## Konfiguracja generowana przez `coderail init`

Scalana z istniejącym `.claude/settings.json` (nie nadpisujemy obcych hooków, pokazujemy diff przed zapisem):

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "npx --no-install coderail hook pre-tool-use", "timeout": 10 }]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [{ "type": "command", "command": "npx --no-install coderail hook post-tool-use", "timeout": 15 }]
      }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "npx --no-install coderail hook stop", "timeout": 60 }] }
    ]
  }
}
```

**Wydajność wywołania**: `npx` dodaje około 100–300 ms. `init` sprawdza więc, czy `node_modules/.bin/coderail` istnieje, i wtedy wpisuje `node ./node_modules/coderail/dist/cli.js hook …` (zmierzone w T-022, decyzja w ADR, jeśli różnica > 50 ms).

## Strategia: która reguła w którym zdarzeniu

| Zdarzenie | Co wiemy | Reguły | Dlaczego tu |
|---|---|---|---|
| `PreToolUse` (Edit/Write) | proponowana treść, plik jeszcze niezapisany | `no-secrets`, `protected-paths`, `layer-boundaries` (importy leksykalnie), `scope-guard` (ścieżka) | **zapobiegamy** zapisowi: sekret nigdy nie trafia na dysk |
| `PostToolUse` (Edit/Write) | plik zapisany, pełny kontekst | reguły AST: `require-tenant-scope`, `no-sensitive-logging`; `no-ai-cheats` (linie) | AST jest droższy; blokada z `reason` sprawia, że agent poprawia od razu |
| `Stop` | wszystkie zmiany w drzewie roboczym | `no-ai-cheats` (osłabione testy, changeset), `scope-guard` (progi), pełny `check` zmienionych plików | łapie obejścia przez Bash (`sed -i`, `>`), które nie przechodzą przez Edit/Write |
| git `pre-commit` | staged diff | wszystkie reguły z `events` zawierającymi `pre-commit` | ostatnia bariera przed historią gita |
| CI (`check`) | cały diff PR | wszystkie | niezależne od lokalnej konfiguracji |

## Symulacja Edit w `PreToolUse`
1. Wczytaj bieżący plik (w granicach projektu). Jeśli nie istnieje, a narzędzie to `Edit`, przepuść (narzędzie samo zgłosi błąd).
2. `replace_all ? content.split(old).join(new) : content.replace(old, new)`, ale tylko gdy `old_string` występuje. Gdy nie występuje: `allow` (Edit i tak się nie wykona).
3. `MultiEdit`: zastosuj edycje po kolei na kopii w pamięci.
4. `changedLines` = linie różne między bieżącą a symulowaną treścią (diff liniowy w `core/diff.ts`).

## Format odpowiedzi CodeRail
| Sytuacja | Odpowiedź |
|---|---|
| brak naruszeń | exit 0, puste stdout |
| tylko `warn` | exit 0 + JSON z `additionalContext` (komunikat why/fix jako informacja). Zweryfikuj wsparcie dla danego zdarzenia w T-020; fallback: stderr bez blokady |
| ≥1 `error` w `PreToolUse` | **exit 2 + stderr** w formacie z `07-komunikaty.md` (prosty, odporny mechanizm) |
| ≥1 `error` w `PostToolUse`/`Stop` | exit 2 + stderr (równoważne `decision: block`) |
| reguła `protected-paths` z `mode: 'ask'` | exit 0 + JSON `permissionDecision: "ask"` |
| błąd wewnętrzny, `failMode: open` | exit 0 + jedna linia ostrzeżenia na stderr (`coderail: internal error, allowing (failMode=open): <kod>`) |
| błąd wewnętrzny, `failMode: closed` | exit 2 + komunikat o błędzie wewnętrznym |
| `stop_hook_active: true` | exit 0 (zawsze) |

## Testowanie integracji
- **Kontrakt**: `tests/fixtures/hook-payloads/*.json`, prawdziwe payloady zarejestrowane z Claude Code (jak je zebrać: dodaj tymczasowo hook `cat > /tmp/payload-$(date +%s).json` w piaskownicy). Jeden plik na kombinację zdarzenie × narzędzie. Testy e2e uruchamiają `dist/cli.js hook <event>` z tym stdin i sprawdzają exit code, stdout i stderr.
- **Zachowanie agenta**: skill `/test-hooka` (piaskownica, prawdziwy Claude Code, 5 scenariuszy).
- **Odporność**: payload pusty, nie-JSON, bez `tool_input`, z nieznanymi polami, z `file_path` poza projektem, z plikiem 5 MB, z niepoprawnym UTF-8. Każdy daje przewidywalny wynik zgodny z `failMode`.
