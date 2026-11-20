# CodeRail

Lokalne CLI w TypeScript, które zamienia reguły architektury i bezpieczeństwa w **twarde blokady** dla agentów AI: hooki Claude Code (`PreToolUse`/`PostToolUse`/`Stop`) i git pre-commit. Gdy agent łamie regułę, CodeRail blokuje zapis (exit 2) i zwraca dwa komunikaty: **dlaczego** (dla człowieka) i **jak naprawić** (dla agenta). Agent poprawia się sam.

Zasady produktu: zero backendu, zero LLM w środku, wszystko lokalnie, hook < 300 ms, zero fałszywych alarmów ważniejsze niż pokrycie.

## Stan projektu
Aktualny etap i zadania: `docs/12-roadmapa.md`. Bieżące zadanie: `.claude/state/task.json` (wstrzykiwane przez hook SessionStart).
**Przed pierwszą zmianą w kodzie: `/start-zadania`.** Bez aktywnego zadania nie ma zmian w kodzie.

## Komendy
```bash
npm run verify:fast    # typecheck + lint + arch + testy zmienionych plików (używa go hook Stop)
npm run verify         # pełna drabina: + format, pokrycie, knip, build, publint/attw, e2e
npm run test           # testy jednostkowe (vitest)
npx vitest run tests/rules/<id>.test.ts   # test jednej reguły
npm run arch           # dependency-cruiser: granice warstw i cykle
npm run bench          # benchmark vs budżety z docs/09-wydajnosc.md
npm run build          # tsup → dist/
```
Przed T-001 (bootstrap) skrypty nie istnieją. Wtedy zgłoś to, nie udawaj, że przeszły.

## Architektura w jednym zdaniu
`cli → adapters → core ← rules`, `presets` = dane. Core i reguły są czyste (bez I/O, console, process). Świat zewnętrzny wchodzi przez porty w `src/core/ports.ts`, a składa go `src/cli/composition.ts`. Szczegóły: `docs/02-architektura.md`.

## Twarde zasady (obowiązują zawsze, także tam, gdzie żaden hook ich nie sprawdza; nie obchodź hooków)
- Test najpierw: zmiana zachowania zaczyna się od czerwonego testu lub fixture'a.
- Zakaz: `any`, `@ts-ignore`, `eslint-disable`, `.only/.skip`, osłabianie lub usuwanie asercji, `console`/`process.exit` poza CLI.
- Tylko pliki z zakresu zadania. Pomysły „przy okazji” zapisuj w `.claude/state/followups.md`.
- Nigdy: praca na `main`, `--no-verify`, force push, `reset --hard`, publikacja, tagi, merge PR, odczyt `.env`, zapis plików przez powłokę (`>`, `sed -i`).
- Nowa zależność, zmiana publicznego kontraktu, zmiana budżetu wydajności = pytasz człowieka + ADR.
- Hook zablokował słuszną zmianę → zatrzymaj się i opisz to człowiekowi. Nie szukaj obejścia.
- Nie ogłaszasz sukcesu bez dowodu (komenda + wynik). Czego nie zweryfikowałeś, piszesz wprost.

## Gdzie co jest
| Potrzebujesz | Plik |
|---|---|
| zakres MVP, czego NIE robimy | `docs/01-wizja-i-zakres.md` |
| warstwy, przepływ danych | `docs/02-architektura.md` |
| typy `Rule`, `Violation`, `CheckContext`, `Config`, kody wyjścia | `docs/03-kontrakty.md` |
| specyfikacje reguł (łapie / nie łapie) | `docs/04-katalog-regul.md` |
| hooki Claude Code: payloady, odpowiedzi, exit 2 | `docs/05-integracja-claude-code.md` |
| `coderail.config.ts`, presety | `docs/06-konfiguracja.md` |
| format komunikatów why/fix | `docs/07-komunikaty.md` |
| strategia testów, fixture'y | `docs/08-testowanie.md` |
| budżety wydajności | `docs/09-wydajnosc.md` |
| gałęzie, commity, PR, release | `docs/10-git-workflow.md` |
| cykl pracy z agentem, Definition of Done | `docs/11-praca-z-agentem.md` |
| decyzje architektoniczne | `docs/adr/` |
| słownik pojęć | `docs/slownik.md` |

Reguły dla konkretnych obszarów ładują się automatycznie z `.claude/rules/`, gdy pracujesz na pasujących plikach.

## Skille (slash commands)
| Skill | Kiedy |
|---|---|
| `/start-zadania [T-xxx]` | początek każdego zadania: gałąź, scope, plan |
| `/nowa-regula [id]` | dodanie reguły (test-first, fixture'y, komunikaty) |
| `/falszywy-alarm [id]` | naprawa FP/FN reguły |
| `/nowy-preset`, `/nowa-komenda` | presety konfiguracji, komendy CLI |
| `/weryfikacja` | przed każdym „gotowe” |
| `/przeglad` | równoległy przegląd subagentami przed PR |
| `/commit`, `/pr` | commit i Pull Request (wywołuje człowiek) |
| `/adr [tytuł]` | decyzja architektoniczna |
| `/benchmark` | pomiar wydajności vs budżety |
| `/test-hooka` | e2e z prawdziwym Claude Code w piaskownicy |
| `/wyjasnij [temat]` | tryb nauki: dlaczego tak, jaka zasada |
| `/przekazanie` | notatka na koniec sesji, przed `/clear` |
| `/bootstrap`, `/release` | jednorazowy setup repo, przygotowanie wydania |

Subagenci (tylko odczyt): `straznik-architektury`, `audytor-testow`, `recenzent-regul`, `audytor-bezpieczenstwa`.

## Język
Kod, identyfikatory, ID reguł i komunikaty CLI po angielsku. Dokumentacja, komentarze-decyzje, opisy PR i rozmowa po polsku (ADR-0005).
