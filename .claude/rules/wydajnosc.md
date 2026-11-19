---
paths:
  - "src/**"
  - "tests/bench/**"
---
# Wydajność (wymaganie produktu, nie optymalizacja)

CodeRail uruchamia się przy **każdym** zapisie pliku przez Claude Code. Wolny hook = wyłączony hook. Budżety: `docs/09-wydajnosc.md`.

| Scenariusz | Budżet p95 |
|---|---|
| `coderail hook pre-tool-use`, plik ≤ 500 linii, reguły bez AST | **< 80 ms** |
| to samo z regułami AST | **< 300 ms** |
| `coderail check --staged`, 20 plików | < 1,5 s |
| zimny start procesu (`node dist/cli.js --version`) | < 60 ms |

## Zasady
- **Nie ładuj tego, czego nie użyjesz.** Dynamiczne importy dla: parsera AST, `@clack/prompts`, komend CLI, ciężkich reguł. Na top-level modułu w ścieżce `hook` dozwolone są tylko lekkie importy.
- **Pre-filtr przed parsowaniem.** Reguła AST najpierw sprawdza tanim `includes`, czy plik w ogóle może zawierać wzorzec.
- **Jedno parsowanie na plik.** AST jest współdzielony między regułami (cache w `CheckContext`).
- **Bez skanowania całego repo w hooku.** Hook analizuje tylko plik z payloadu (i ewentualnie jego bezpośredni kontekst z configu). Skan całości to `check` w CI.
- **Regexy kompiluj raz** (na poziomie modułu, nie w pętli) i pamiętaj o `lastIndex` przy flagach `g`/`y`.
- Każda zmiana w `src/core/` lub nowa reguła z `needsAst` wymaga uruchomienia `npm run bench` i porównania z budżetem w opisie PR (skill `/benchmark`).
- Nowa zależność w ścieżce `hook` wymaga pomiaru czasu importu (`node --cpu-prof` lub `hyperfine`) i zgody człowieka.
