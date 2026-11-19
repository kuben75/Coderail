# Słownik

| Pojęcie | Znaczenie w CodeRail |
|---|---|
| **Reguła (rule)** | czysta funkcja `check(ctx, options) => Violation[]` z metadanymi (`meta`); jedna reguła = jeden plik w `src/rules/` |
| **Naruszenie (violation)** | wynik reguły: plik, linia, severity, komunikat `human`/`agent`, opcjonalnie zredagowane `evidence` |
| **Severity** | `error` (blokuje), `warn` (informuje), `off` (wyłączona) |
| **Scope reguły** | `line` (tylko zmienione linie), `file` (cały plik), `changeset` (wiele plików naraz) |
| **Diff-aware** | raportowanie tylko nowych naruszeń, czyli w zmienionych liniach lub przez porównanie przed/po (ADR-0006) |
| **changedLines** | zakresy linii dodanych lub zmienionych w bieżącej zmianie |
| **CheckContext** | wszystko, czego reguła potrzebuje: treść pliku przed/po, zmienione linie, config, leniwy AST |
| **Silnik (engine)** | uruchamia aktywne reguły na kontekstach, izoluje crashe, sortuje wyniki |
| **Port** | interfejs zdefiniowany w core dla potrzeb zewnętrznych (np. `GitClient`) |
| **Adapter** | implementacja portu lub tłumacz świata zewnętrznego (stdin Claude Code, git, fs) |
| **Composition root** | jedno miejsce (`src/cli/composition.ts`), gdzie tworzy się adaptery i wstrzykuje je do core |
| **Preset** | gotowa konfiguracja (`node-api`, `nextjs-app`, `strict-saas`) |
| **Warstwa (layer)** | nazwana grupa ścieżek z listą dozwolonych zależności (`layer-boundaries`) |
| **Hook (Claude Code)** | komenda uruchamiana przez Claude Code w zdarzeniu cyklu życia (`PreToolUse`, `PostToolUse`, `Stop`…) |
| **Pętla samonaprawcza** | blokada (exit 2) → komunikat Fix trafia do agenta → agent poprawia w następnym kroku |
| **Fail-open / fail-closed** | przy błędzie wewnętrznym: przepuść z ostrzeżeniem / zablokuj (ADR-0004) |
| **Fixture** | plik przykładowego kodu (`bad/`, `good/`, `edge/`) będący wykonywalną specyfikacją reguły |
| **FP / FN** | false positive (fałszywy alarm) / false negative (przeoczenie) |
| **Pre-filtr** | tani test tekstowy (`includes`) przed regexem lub AST |
| **ReDoS** | atak przez regex z katastrofalnym backtrackingiem (wykładniczy czas) |
| **Redakcja** | maskowanie sekretów w każdym wyjściu (`sk-ant-…(108 chars)`) |
| **Scope guard** | blokada zmian w plikach spoza zakresu zadania |
| **Ignore directive** | `// coderail-ignore-next-line <id> -- <powód>`; dodana przez agenta nie działa |
| **Changeset** | plik `.changeset/*.md` opisujący zmianę dla CHANGELOG i bump wersji |
| **Provenance** | podpisane pochodzenie paczki npm (zbudowana w CI z konkretnego commita) |
| **DoD** | Definition of Done, `docs/11-praca-z-agentem.md` |
| **Dogfooding** | używanie CodeRail do pilnowania repozytorium CodeRail (T-030) |
