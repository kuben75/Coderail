# Fixture'y reguł

## Struktura
```
tests/fixtures/no-secrets/
├── bad/
│   ├── anthropic-key-in-const.ts
│   ├── aws-key-in-object.ts
│   ├── db-url-with-password.ts
│   ├── stripe-live-in-template-literal.ts
│   └── private-key-block.ts
├── good/
│   ├── key-from-env.ts            # process.env.ANTHROPIC_API_KEY
│   ├── placeholder-in-docs.ts     # "sk-ant-..." w komentarzu z trzema kropkami
│   ├── test-key-prefix-only.ts    # sam prefiks bez wartości
│   ├── db-url-without-password.ts
│   └── high-entropy-hash.ts       # hash commita / sha256, który NIE jest sekretem
└── edge/
    ├── ignore-with-reason.ts      # coderail-ignore-next-line no-secrets -- public test key from docs
    ├── ignore-without-reason.ts   # ignore bez powodu => naruszenie ignore-without-reason
    ├── crlf-line-endings.ts
    ├── empty.ts
    └── very-long-line.ts          # 100 KB, sprawdza ReDoS i wydajność
```

Nazwy plików opisują przypadek (kebab-case). Nie numeruj ich `case1.ts`.

## Nagłówki (parsowane przez test)
Pierwsza linia każdego fixture'a:

```ts
// expect: no-secrets line 3
// expect: no-secrets line 3, line 7
// expect: ignore-without-reason line 2
// expect: none
// why-good: klucz czytany ze zmiennej środowiskowej, nie wpisany w kod
```

- `bad/*`: co najmniej jedno `expect: <id> line <n>`
- `good/*`: `expect: none` oraz `why-good: ...`
- `edge/*`: dowolne `expect`, plus komentarz `// edge: <co sprawdza>` w drugiej linii

Dla plików, w których komentarz w pierwszej linii zmieniłby wynik (np. reguła o komentarzach), nagłówek można dać w pliku obok: `<nazwa>.expect.json` z `{ "violations": [{ "ruleId": "...", "line": 3 }] }`.

## Fałszywe sekrety
Każda wartość wyglądająca na sekret MUSI zawierać `FAKE` lub `EXAMPLE`:
```ts
const key = "sk-ant-api03-FAKE0000000000000000000000000000000000000000"; // FAKE
```
Inaczej zapis zablokuje hook `pre-edit-guard`, a CI zatrzyma gitleaks (allowlist obejmuje tylko `tests/fixtures/**` z markerem).

## Fixture'y to celowo zły kod
Są wyłączone z ESLinta, Prettiera, tsc (osobny `tsconfig` bez `tests/fixtures`) i hooka anti-cheat. Nie „poprawiaj” ich przy okazji.

## Pliki wielokrokowe (scope: changeset)
Dla reguł analizujących wiele plików naraz (np. `scope-guard`, usunięte asercje) fixture to katalog:
```
tests/fixtures/no-ai-cheats/bad/removed-assertion/
├── before/foo.test.ts
├── after/foo.test.ts
└── expect.json
```
