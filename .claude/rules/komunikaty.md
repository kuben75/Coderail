---
paths:
  - "src/rules/**"
  - "src/cli/output.ts"
  - "src/core/messages.ts"
  - "src/adapters/claude-code/**"
---
# Komunikaty naruszeń

Komunikat to **główny wyróżnik produktu**: pętla samonaprawcza agenta i tryb nauki dla człowieka. Pełna specyfikacja: `docs/07-komunikaty.md`.

## Format stderr przy blokadzie (exit 2)
```
coderail: blocked <N> violation(s) in <file>

✖ <rule-id> (<category>) <file>:<line>:<col>
  Why: <human, max 2 zdania>
  Fix: <agent: konkretna dyrektywa>
  Docs: coderail explain <rule-id>
```

## Zasady treści
- **Why** (dla człowieka): skutek biznesowy lub architektoniczny („tenant A zobaczy faktury tenanta B”), a nie powtórzenie reguły („missing tenantId”).
- **Fix** (dla agenta): tryb rozkazujący, konkretne miejsce, konkretna zmiana. Używaj nazw z kontekstu (plik, funkcja, model, import). Jeśli są dwie dobre drogi, podaj preferowaną i jedną alternatywę.
- **Nigdy** nie sugeruj obejścia (`coderail-ignore`, wyłączenie reguły, `--no-verify`) jako naprawy. Ignore jest dla człowieka i to on decyduje.
- **Nigdy** nie wypisuj sekretu ani pełnej linii z sekretem. Pokazuj tylko zredagowany fragment.
- Długość: Why ≤ 220 znaków, Fix ≤ 400 znaków. Przy wielu naruszeniach w jednym pliku pokaż max 5 i podsumowanie „+N more”.
- Komunikaty po angielsku (ADR-0005). Teksty żyją w pliku reguły (`meta.messages`), parametryzowane funkcją. Bez sklejania stringów w wielu miejscach.
- Każda zmiana treści komunikatu aktualizuje snapshot w `tests/rules/<id>.test.ts` (hook zapyta o zgodę) i przykład w `docs/04-katalog-regul.md`.
