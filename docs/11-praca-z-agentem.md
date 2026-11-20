# 11. Praca z agentem (instrukcja dla Ciebie)

Ten dokument opisuje, **jak Ty** prowadzisz Claude Code w tym projekcie. Agent zna zasady z `CLAUDE.md` i `.claude/rules/`. Ty pilnujesz celu, zakresu i jakości.

## Podział ról
| Ty (człowiek) | Agent |
|---|---|
| wybierasz zadanie z roadmapy, akceptujesz zakres i plan | proponuje zakres, plan, pyta o niejasności |
| akceptujesz ADR, nowe zależności, zmiany kontraktów | proponuje ADR, uzasadnia |
| reviewujesz PR, mergujesz, wydajesz | implementuje test-first, weryfikuje, otwiera PR |
| decydujesz przy fałszywych alarmach hooków | zgłasza blokadę, nie obchodzi jej |
| uczysz się: `/wyjasnij` przy każdej niejasnej decyzji | tłumaczy z odniesieniem do kodu |

## Cykl jednego zadania

```
/start-zadania T-012          → gałąź, task.json (scope), plan.md, pytania
  (Shift+Tab: plan mode)      → przy zadaniach > 5 kroków, przejrzyj plan przed kodem
"realizuj plan"               → agent: test (czerwony) → implementacja → verify:fast
  ↳ hooki pilnują w tle       → PostToolUse blokuje any/ts-ignore/importy; Stop wymusza DoD
/weryfikacja                  → pełna drabina + dowody dla kryteriów akceptacji
/przeglad                     → 2–4 subagentów równolegle, raport z priorytetami
/commit                       → atomowe commity (zatwierdzasz)
/pr                           → push + PR (zatwierdzasz push), task.json → done
GitHub: review + squash merge
/przekazanie + /clear         → czysty kontekst na następne zadanie
```

## Dobre praktyki sesji
- **Jedno zadanie = jedna sesja.** Długie sesje degradują jakość (kompaktowanie gubi szczegóły). Hook `SessionStart` po kompaktowaniu przypomina twarde zasady, ale lepiej `/przekazanie` + `/clear`.
- **Plan mode dla zadań > 5 kroków.** Przejrzyj plan, popraw zakres, dopiero wtedy implementacja.
- **Konkretny prompt > długi prompt.** „Zrealizuj krok 3 planu: fixture'y bad dla no-secrets” jest lepsze niż „zrób regułę”.
- **Czytaj diff, nie podsumowanie.** Podsumowanie agenta to deklaracja, diff to fakt. `git diff` albo PR na GitHubie.
- **`/context`** gdy agent zachowuje się dziwnie: sprawdź, jakie reguły i pliki są załadowane.
- **Ucz się na blokadach.** Każdy komunikat `DLACZEGO:` z hooka to mini-lekcja. Gdy nie rozumiesz: `/wyjasnij <pojęcie>`.

## Gdy hook blokuje
| Sytuacja | Co robisz |
|---|---|
| agent złamał zasadę, hook słusznie zablokował | nic, agent poprawi się sam (to jest pętla samonaprawcza) |
| agent zgłasza, że blokada jest błędna | oceń. Jeśli ma rację: popraw hook **sam** (agent nie może edytować `.claude/hooks/`), dodaj przypadek testowy do `.claude/hooks/README.md` |
| agent próbuje obejść hook (Bash zamiast Edit, rozbicie zapisu, zmiana ścieżki) | przerwij (Esc), powiedz wprost „nie obchodź hooka, opisz problem”. Zanotuj wzorzec: to materiał na regułę produktu |
| scope guard blokuje potrzebny plik | agent proponuje edycję zakresu w `task.json`, a hook pyta Ciebie o zgodę (pokazuje stary i nowy zakres). Możesz też kazać agentowi zapisać to jako follow-up |
| Stop hook zapętla się na czerwonym teście | hook blokuje zakończenie raz. Przy kolejnej próbie w tym samym ciągu (`stop_hook_active`) przepuszcza, nawet jeśli testy dalej są czerwone. Agent musi wtedy napisać, czego nie umie naprawić. Zdecyduj ty |

## Definition of Done (sprawdza hook Stop + `/weryfikacja`)
- [ ] kryteria akceptacji z `task.json` mają dowody (test/komenda/plik)
- [ ] test-first: istnieje test, który bez zmiany jest czerwony
- [ ] `npm run verify` zielone (pełna drabina)
- [ ] reguła: fixture'y 5/5/3, wpis w `docs/04-katalog-regul.md`, benchmark w budżecie
- [ ] dokumentacja zaktualizowana
- [ ] changeset (dla `src/`)
- [ ] zmiany tylko w zakresie; pomysły spoza zakresu w `followups.md`
- [ ] przegląd subagentów bez blokujących uwag
- [ ] podsumowanie agenta zawiera „czego nie zweryfikowałem”

## Review PR: na co patrzeć (10 minut)
1. **Testy najpierw**: czy fixture'y `good/` zawierają przypadki „podobne do bad, ale poprawne”? (FP)
2. **Diff testów**: czy żaden istniejący test/fixture nie został osłabiony?
3. **Granice**: czy nowe importy pasują do warstw? (CI `arch` to łapie, ale sprawdź sens)
4. **Komunikaty**: przeczytaj Why/Fix na głos. Czy junior zrozumie Why? Czy agent wie, co zrobić po Fix?
5. **Wydajność**: wynik benchmarku w opisie PR vs budżet
6. **Zakres**: czy PR robi jedną rzecz?

## Kiedy pytać agenta o `/wyjasnij`
Przy każdym pierwszym spotkaniu z: portem/adapterem, composition root, AST, diff-aware, fail-open, ReDoS, changesets, provenance. Cel projektu to też Twoja nauka architektury. Jedno `/wyjasnij` na zadanie to dobra norma.

## Pliki stanu (`.claude/state/`, poza gitem)
| Plik | Kto pisze | Po co |
|---|---|---|
| `task.json` | `/start-zadania`, `/pr` (status done) | zakres dla scope guard, kryteria |
| `plan.md` | `/start-zadania`, agent odhacza | kroki zadania |
| `followups.md` | agent | pomysły spoza zakresu, przeglądasz po zadaniu i dopisujesz do roadmapy |
| `handoff.md` | `/przekazanie` | ciągłość między sesjami |
| `last-verify.json` | hook Stop | cache: nie powtarza weryfikacji bez zmian |
