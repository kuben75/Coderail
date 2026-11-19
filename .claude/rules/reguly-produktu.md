---
paths:
  - "src/rules/**"
  - "tests/rules/**"
  - "tests/fixtures/**"
---
# Pisanie reguł CodeRail

Reguły to produkt. Jedna reguła z fałszywymi alarmami niszczy zaufanie do całego narzędzia: użytkownik wyłączy hook i nie wróci. **Precyzja jest ważniejsza niż pokrycie.** Lepiej przepuścić rzadki przypadek, niż blokować poprawny kod.

Procedura krok po kroku: skill `/nowa-regula`. Specyfikacje: `docs/04-katalog-regul.md`.

## Kontrakt reguły
- Plik: `src/rules/<kategoria>/<rule-id>.ts`. `rule-id` w kebab-case, unikalny, niezmienny po wydaniu (użytkownicy mają go w configu).
- Eksport: `export const <camelCaseId>: Rule<Options>` z kompletnym `meta`:
  - `id`, `category` (`security` | `architecture`), `description` (1 zdanie, EN)
  - `defaultSeverity` (`error` blokuje, `warn` tylko informuje)
  - `scope` (`line`: tylko zmienione linie; `file`: cały plik; `changeset`: wiele plików naraz)
  - `needsAst` (true tylko jeśli regex naprawdę nie wystarcza)
  - `events`: w których zdarzeniach ma sens (`pre-tool-use`, `post-tool-use`, `stop`, `pre-commit`, `ci`)
  - `optionsSchema` (zod, z wartościami domyślnymi)
- Rejestracja: `src/rules/index.ts` (kolejność alfabetyczna po ID).

## Jakość detekcji
- **Najpierw najtańsza metoda.** Szybki pre-filtr tekstowy (`content.includes('findMany')`), potem regex, AST na końcu i tylko dla plików, które przeszły pre-filtr.
- **Regex bez ReDoS.** Bez zagnieżdżonych kwantyfikatorów (`(a+)+`, `(.*)*`), bez alternatyw z nakładającymi się prefiksami pod kwantyfikatorem. Każdy regex ma test z wejściem 100 KB, który musi przejść w < 50 ms.
- **Komentarze i stringi.** Jeśli wzorzec w komentarzu albo stringu nie jest błędem (np. `@ts-ignore` w stringu dokumentacji), reguła musi to rozróżniać (AST albo tokenizer), a fixture `good/` musi to pokrywać.
- **Mechanizm wyjątków.** Każda reguła respektuje `// coderail-ignore-next-line <rule-id> -- <powód>`. Powód jest obowiązkowy. Bez powodu ignore sam jest naruszeniem (`ignore-without-reason`).
- **Redakcja sekretów.** `Violation.evidence` NIGDY nie zawiera pełnego sekretu. Pokazuj prefiks i maskę: `sk-ant-…(48 znaków)`. stderr trafia do kontekstu modelu i do logów.

## Komunikat
Każde naruszenie ma dwa bloki (`docs/07-komunikaty.md`):
- `human`: max 2 zdania. DLACZEGO to grozi wyciekiem albo psuje architekturę. Bez żargonu bez wyjaśnienia.
- `agent`: konkretna dyrektywa naprawcza z nazwami plików i symboli z kontekstu. Nie pisz „fix the issue”. Pisz „Move the `prisma.user.findMany` call from `components/UserList.tsx` to a server module (e.g. `src/server/users.ts`) and pass data via props”.

## Fixture'y (obowiązkowe)
```
tests/fixtures/<rule-id>/
  bad/    # każdy plik MUSI dać ≥1 naruszenie; nagłówek: // expect: <rule-id> line <n>[, line <m>]
  good/   # każdy plik MUSI dać 0 naruszeń; nagłówek: // why-good: <co ten przypadek sprawdza>
  edge/   # przypadki graniczne (komentarze, stringi, ignore z powodem, CRLF, pusty plik)
```
- Minimum na start: **5 bad, 5 good, 3 edge**. Każdy zgłoszony fałszywy alarm = nowy plik w `good/` przed poprawką (skill `/falszywy-alarm`).
- Fałszywe sekrety w fixture'ach muszą zawierać marker `FAKE` lub `EXAMPLE` w wartości. Inaczej zablokuje je hook i gitleaks.
- Fixture'y to celowo zły kod. Nie „poprawiaj” ich, nie lintuj, nie formatuj (są w `.prettierignore` i `ignores` ESLinta).
