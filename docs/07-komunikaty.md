# 07. Komunikaty

Komunikat to **interfejs produktu** dla dwóch odbiorców jednocześnie:
- **agent**: musi z komunikatu wiedzieć, co dokładnie zmienić, żeby w następnym kroku przejść blokadę,
- **człowiek**: ma zrozumieć, dlaczego to ważne (tryb nauki), w 5 sekund, w terminalu.

## Format stderr (blokada, exit 2)

```
coderail: blocked 2 violations in src/components/InvoiceList.tsx

✖ layer-boundaries (architecture) src/components/InvoiceList.tsx:3:1
  Why: InvoiceList.tsx is client code; importing @prisma/client couples UI to the database and ships server logic toward the browser.
  Fix: Move the `prisma.invoice.findMany` call to a server module (e.g. src/server/invoices.ts or a Server Action) and pass invoices to InvoiceList via props.
  Docs: coderail explain layer-boundaries

✖ require-tenant-scope (security) src/components/InvoiceList.tsx:9:22
  Why: Without a tenantId filter this query returns invoices of every organization; one customer would see another's data.
  Fix: Add `tenantId: ctx.tenantId` to the `where` of `prisma.invoice.findMany` (take the tenant from the session, never from user input).
  Docs: coderail explain require-tenant-scope
```

- bez kolorów ANSI na stderr w trybie hook (Claude Code pokazuje surowy tekst)
- max 5 naruszeń na plik, potem `… and N more (run: coderail check src/components/InvoiceList.tsx)`
- kolejność: najpierw security, potem architecture; w ramach kategorii po linii

## Format `check` (terminal)
Ten sam układ, z kolorami (gdy TTY i brak `NO_COLOR`), plus podsumowanie:
```
✖ 3 errors, 1 warning in 2 files (12 files checked, 41 ms)
```

## Format JSON (`--format json`)
```json
{
  "version": 1,
  "violations": [
    {
      "ruleId": "no-secrets", "category": "security", "severity": "error",
      "file": "src/ai.ts", "line": 4, "column": 30,
      "message": { "human": "…", "agent": "…" },
      "evidence": "sk-ant-…(108 chars)"
    }
  ],
  "ruleErrors": [],
  "stats": { "files": 12, "rules": 7, "durationMs": 41, "astParsed": 3 }
}
```
Pole `version` zmieniamy przy każdej niekompatybilnej zmianie schematu.

## Zasady treści

### Why (człowiek)
- **Skutek, nie definicja.** ✗ „Missing tenantId in where clause.” ✓ „…one customer would see another's data.”
- max 2 zdania, ≤ 220 znaków, bez żargonu bez wyjaśnienia
- konkret z kontekstu, gdy wzmacnia przekaz (nazwa pliku, modelu)

### Fix (agent)
- **tryb rozkazujący** + **miejsce** + **zmiana**: „Move X from A to B”, „Add Y to Z in file:line”
- nazwy z kontekstu: plik, symbol, model, import, zmienna env
- jedna preferowana droga, opcjonalnie jedna alternatywa („or …”)
- ≤ 400 znaków
- **nigdy**: sugestia wyciszenia (`coderail-ignore`, `--no-verify`, wyłączenie reguły), polecenia ogólne („fix the issue”, „follow best practices”)
- gdy naprawa wymaga decyzji człowieka: „Stop and ask the human whether …”

### Evidence
- krótki fragment pomagający zlokalizować problem
- **sekrety zawsze zredagowane**: prefiks + długość: `sk-ant-…(108 chars)`, `postgres://admin:***@db.internal`

## Testowanie komunikatów
- snapshot `message.human` i `message.agent` dla jednego `bad/` fixture'a na regułę
- asercja, że `agent` zawiera nazwę pliku lub symbolu z fixture'a
- asercja, że żadna część wyjścia (stderr, JSON) nie zawiera pełnej wartości sekretu
- `/test-hooka`: czy prawdziwy agent poprawia się w pierwszej próbie. Jeśli nie, komunikat do poprawy

## Dlaczego angielski
Komunikaty czyta model (najlepiej rozumie EN) i globalni użytkownicy npm. Polskie tłumaczenia mogą dojść w v2 przez `locale` w configu. Struktura `meta.messages` (funkcje) to umożliwia. Decyzja: ADR-0005.
