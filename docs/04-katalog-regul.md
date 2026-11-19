# 04. Katalog reguł

Specyfikacja każdej reguły MVP. Kod ma odpowiadać specyfikacji, a gdy świadomie od niej odbiega, aktualizujemy spec w tym samym PR. Sekcja **„NIE łapie”** jest równie ważna jak „łapie”: to umowa z użytkownikiem i ochrona przed fałszywymi alarmami.

## Zasady wspólne dla wszystkich reguł
- **Diff-aware** (ADR-0006): reguły `scope: 'line'` raportują tylko w `changedLines`. Stary kod nie blokuje nowej pracy.
- **Ignore**: `// coderail-ignore-next-line <id> -- <powód>`. Powód jest wymagany.
- **Ignore dodany przez agenta nie działa.** W zdarzeniach `pre-tool-use` / `post-tool-use` dyrektywa ignore leżąca w zmienionych liniach jest pomijana (hook = zmiana od agenta). Respektowane są tylko dyrektywy, które istniały wcześniej (`previousContent`) albo zostały zacommitowane przez człowieka (`pre-commit`, `ci`). Dodanie ignore przez agenta daje naruszenie `ignore-added-by-agent` (error) z Fix: „Do not suppress. Fix the code or ask the human to add the ignore with a reason.”
- **Fałszywe wartości**: tokeny zawierające `FAKE` lub `EXAMPLE` nie są traktowane jako sekrety.
- **Severity** w presetach: `error` blokuje, `warn` informuje (w hooku: komunikat bez blokady).

## Szablon sekcji reguły
```
### <rule-id>
| | |
|---|---|
| Kategoria / severity | security|architecture / error|warn |
| Scope / events / AST | line|file|changeset / … / tak|nie |
| Cel | 1–2 zdania: jaki realny problem rozwiązuje |
**Łapie:** …   **NIE łapie (świadomie):** …   **Opcje:** …   **Przykłady:** bad/good   **Komunikat:** why / fix
```

---

## Security

### no-secrets
| | |
|---|---|
| Kategoria / severity | security / **error** |
| Scope / events / AST | line / pre-tool-use, post-tool-use, pre-commit, ci / nie |
| Cel | Klucz w kodzie trafia do historii gita i do każdego, kto ma dostęp do repo, także po usunięciu. |

**Łapie**
- znane formaty: AWS (`AKIA…`/`ASIA…`), Anthropic (`sk-ant-…`), OpenAI (`sk-…`, `sk-proj-…`), Stripe live (`sk_live_`, `rk_live_`), GitHub (`ghp_`, `gho_`, `github_pat_`), Slack (`xox[abprs]-`), npm (`npm_`), Google API (`AIza…`), bloki `-----BEGIN … PRIVATE KEY-----`
- URL-e baz z hasłem: `postgres://user:pass@`, `mysql://`, `mongodb(+srv)://`, `redis://`, `amqp://`
- przypisania do zmiennych o nazwach sekretów (`apiKey`, `secret`, `token`, `password`, `privateKey`) **literału string o wysokiej entropii** (≥ 20 znaków, entropia Shannona ≥ 3,5 bita/znak)
- zapis do plików `.env`, `.env.*` (poza `.env.example`), `*.pem`, `*.key` przez narzędzie Write/Edit (pre-tool-use, na podstawie ścieżki)

**NIE łapie (świadomie)**
- wartości z markerem `FAKE`/`EXAMPLE`; placeholdery (`sk-ant-...`, `<YOUR_KEY>`, `xxx`, `changeme`)
- odczyt ze zmiennych (`process.env.X`, `import.meta.env.X`)
- hashy (sha1/sha256, hash commita, integrity w lockfile) bez kontekstu nazwy sekretu
- kluczy publicznych (`pk_live_`, `pk_test_`, publiczne klucze JWT/JWKS)
- plików binarnych, lockfile'i, `*.min.js`

**Opcje**: `extraPatterns: {name, pattern}[]` (max 200 znaków na wzorzec), `allowIn: string[]` (domyślnie `[]`), `entropyThreshold` (3.5).

**Przykłady**
```ts
// bad
const anthropic = new Anthropic({ apiKey: 'sk-ant-api03-…' });
const db = 'postgres://admin:S3cretPass@db.internal:5432/app';
// good
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const example = 'sk-ant-...'; // placeholder w dokumentacji
```
**Komunikat**: Why: *A hardcoded Anthropic API key ends up in git history and leaks to anyone with repo access, even after you delete it.* Fix: *Remove the key from src/ai.ts:4. Read it from `process.env.ANTHROPIC_API_KEY` and add `ANTHROPIC_API_KEY=` (no value) to .env.example.* Evidence: `sk-ant-…(108 chars)`.

---

### protected-paths
| | |
|---|---|
| Kategoria / severity | security / **error** |
| Scope / events / AST | file / pre-tool-use, pre-commit / nie |
| Cel | Niektóre pliki agent zmienia „przy okazji” z katastrofalnym skutkiem: stare migracje, konfiguracja auth, CI. |

**Łapie**: zapis (Write/Edit/MultiEdit) do ścieżek pasujących do `protectedPaths` z configu. W `pre-commit`: zmodyfikowane lub usunięte pliki chronione w staged diff (dodanie nowej migracji jest OK, zmiana istniejącej nie).

**Domyślne `protectedPaths` (preset)**:
| Glob | Powód |
|---|---|
| `prisma/migrations/*/migration.sql` (tylko istniejące) | zastosowana migracja jest niezmienna, zmiana schematu = nowa migracja |
| `drizzle/**/*.sql` (istniejące) | jw. |
| `.env.example` | kontrakt zmiennych środowiskowych zespołu |
| `**/auth.config.*`, `**/middleware.ts` (nextjs), `**/*.guard.ts` (nest) | konfiguracja bezpieczeństwa |
| `.github/workflows/**` | CI to bariera bezpieczeństwa |
| `.claude/settings.json`, `.claude/hooks/**`, `coderail.config.*` | agent nie może wyłączać własnych barier |

**NIE łapie**: tworzenia nowych plików w katalogu migracji; zmian wykonanych przez człowieka w pre-commit, gdy w commicie jest trailer `Coderail-Allow: <glob> -- <powód>` (to „jawna flaga człowieka”); odczytu.

**Opcje**: `paths: {glob, reason, mode: 'deny'|'ask'}[]`. `ask` w hooku daje `permissionDecision: "ask"`, czyli Claude Code pyta człowieka.

**Komunikat**: Why: *prisma/migrations/20240101_init/migration.sql is an applied migration; editing it desyncs every existing database from the schema history.* Fix: *Revert this edit. Change prisma/schema.prisma and generate a new migration with `npx prisma migrate dev --name <change>`.*

---

### require-tenant-scope
| | |
|---|---|
| Kategoria / severity | security / **error** w `strict-saas`, wyłączona w innych presetach |
| Scope / events / AST | line / post-tool-use, pre-commit, ci / **tak** |
| Cel | Zapytanie bez filtra tenanta to wyciek danych między klientami: najdroższy błąd w SaaS. |

**Łapie** (Prisma) wywołania `findMany`, `findFirst`, `findFirstOrThrow`, `findUnique*`, `count`, `aggregate`, `groupBy`, `update`, `updateMany`, `delete`, `deleteMany`, `upsert` na modelach z `tenancy.models`, gdy argument:
- nie ma `where`, albo
- `where` jest literałem obiektu bez żadnego z `tenancy.scopeFields` (np. `tenantId`, `organizationId`) na najwyższym poziomie ani w `AND: [...]`.

Łapie też wywołania przez `prisma.<model>`, `tx.<model>` (transakcje), `this.prisma.<model>` (NestJS), `db.<model>`.

**Drizzle**: `db.select().from(<table>)` / `db.update(<table>)` / `db.delete(<table>)` bez `.where(...)` zawierającego `eq(<table>.<scopeField>, …)`.

**NIE łapie (świadomie, bo nie da się tego rozstrzygnąć statycznie bez FP)**
- `where` przekazany jako zmienna lub wynik funkcji (`findMany({ where })`, `where: buildTenantWhere(ctx)`), bo zakładamy helper. Opcja `strictVariables: true` zmienia to na `warn`.
- spread (`where: { ...tenantFilter, status }`). Traktowany jako „może zawierać scope”.
- `create`/`createMany` (scope ustawia się w `data`, sprawdza to opcjonalna reguła v2)
- modele spoza `tenancy.models`, surowe SQL (`$queryRaw`), bo to osobna reguła v2
- zapytania w plikach `**/seed.*`, `**/*.test.*`, `prisma/**` (domyślny `exclude` reguły)

**Opcje**: `models: string[]`, `scopeFields: string[]` (domyślnie `['tenantId']`), `strictVariables: boolean` (false), `exclude: string[]`.

**Przykłady**
```ts
// bad
await prisma.invoice.findMany({ where: { status: 'PAID' } });
await this.prisma.client.delete({ where: { id } });
// good
await prisma.invoice.findMany({ where: { tenantId: ctx.tenantId, status: 'PAID' } });
await prisma.client.delete({ where: { id_tenantId: { id, tenantId } } }); // klucz złożony zawierający scopeField
await prisma.invoice.findMany({ where: tenantWhere(ctx, { status: 'PAID' }) }); // helper — NIE łapie
```
**Komunikat**: Why: *Without a tenantId filter this query returns invoices of every organization; one customer would see another's data.* Fix: *Add `tenantId` to the `where` of `prisma.invoice.findMany` in src/server/invoices.ts:18 (e.g. `where: { tenantId: ctx.tenantId, … }`), using the tenant from the request context, never from user input.*

---

### no-sensitive-logging
| | |
|---|---|
| Kategoria / severity | security / **warn** (preset `strict-saas`: error) |
| Scope / events / AST | line / post-tool-use, pre-commit, ci / tak |
| Cel | Logi trafiają do zewnętrznych systemów (Datadog, Sentry, stdout kontenera). Hasło lub token w logu to wyciek. |

**Łapie**
- `console.*`, `logger.*` (`info|warn|error|debug|log`), `this.logger.*` z argumentem będącym identyfikatorem lub dostępem do właściwości o nazwie pasującej do `/(password|passwd|secret|token|apiKey|api_key|authorization|cookie|session|creditCard|cardNumber|cvv|ssn|pesel)/i`
- logowanie całego `req.headers`, `req.cookies`, `req.body` w handlerach HTTP
- zwracanie surowego błędu w odpowiedzi HTTP: `res.json(err)`, `res.send(error.stack)`, `return { error: e.message }` w route handlerach Next.js, `throw new HttpException(err, …)` z obiektem błędu

**NIE łapie**: nazw w stringach (`console.log('password reset requested')`), zmiennych zawierających słowo jako część nazwy bez wartości wrażliwej (`passwordPolicy`, `tokenExpiresAt`, `isTokenValid`; lista wyjątków przez sufiksy `Policy|ExpiresAt|Length|Count|Valid|Required|Field|Label`), logowania w testach.

**Komunikat**: Why: *Logging `user.password` sends the raw credential to every log sink; logs are rarely access-controlled like the database.* Fix: *Remove `user.password` from the log in src/auth/login.ts:31. Log a non-sensitive identifier instead (e.g. `userId`).*

---

## Architecture

### layer-boundaries
| | |
|---|---|
| Kategoria / severity | architecture / **error** |
| Scope / events / AST | file (raport na liniach importów, zawsze diff-aware: tylko NOWE importy) / pre-tool-use, post-tool-use, pre-commit, ci / nie (parser importów leksykalny, AST tylko gdy potrzebny) |
| Cel | Zakazane zależności między warstwami to najszybsza droga do spaghetti i wycieków (klucz serwerowy w bundlu klienta). |

**Łapie**: import (statyczny, `import type` tylko gdy `includeTypeImports: true`, dynamiczny `import()`, `require`), którego cel należy do warstwy niedozwolonej dla warstwy pliku źródłowego wg `layers` w configu. Rozwiązuje ścieżki względne, aliasy z `tsconfig.json` (`paths`) i pakiety (np. `@prisma/client` zadeklarowany jako warstwa `infrastructure`).

**Wbudowane sprawdzenia presetu `nextjs-app`**:
- plik z `'use client'` importuje `@prisma/client`, `drizzle-orm`, `server-only`, moduły z warstwy `server` lub zmienne env bez prefiksu `NEXT_PUBLIC_`
- komponent w `app/**` lub `components/**` importuje klienta bazy

**NIE łapie**: importów typów (domyślnie, bo nie trafiają do bundla), plików spoza zdefiniowanych warstw (to nie jest błąd, tylko brak konfiguracji; `coderail check` wypisuje je jako info), istniejących importów niezmienionych w diffie.

**Opcje**: `layers` (z configu), `includeTypeImports` (false), `unassigned: 'ignore'|'warn'`.

**Komunikat**: Why: *components/UserList.tsx is client code; importing @prisma/client ships database access logic toward the browser and couples UI to the database.* Fix: *Move the `prisma.user.findMany` call to a server module (e.g. src/server/users.ts or a Server Action) and pass the result to `UserList` via props.*

---

### no-ai-cheats
| | |
|---|---|
| Kategoria / severity | architecture / **error** (osłabione testy), **warn** (pozostałe w presecie `node-api`) |
| Scope / events / AST | line + changeset / post-tool-use, stop, pre-commit, ci / nie (leksykalnie, z pominięciem stringów i komentarzy) |
| Cel | Wykrywa skróty, którymi modele „zamykają” zadanie zamiast je rozwiązać. |

**Łapie (tylko NOWE wystąpienia względem `previousContent` / HEAD)**
- `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error` bez opisu (< 10 znaków)
- `eslint-disable*`, `biome-ignore`, `prettier-ignore` w plikach źródłowych
- `as any`, `: any`, `<any>`, `as unknown as`
- `.only`, `.skip`, `.todo`, `xit`, `xdescribe`, `fit`, `fdescribe`, `test.fails`
- **osłabione testy** (changeset): w pliku testowym spadła liczba asercji (`expect(`, `assert`) lub przypadków (`it(`, `test(`) względem HEAD; usunięty plik testowy, którego testowany moduł nadal istnieje; zmieniona wartość oczekiwana w snapshotach/fixture'ach (raport: warn + lista)
- puste bloki `catch {}` i `catch (e) {}` dodane w kodzie źródłowym (połykanie błędów)

**NIE łapie**: wzorców w stringach i komentarzach zwykłych (np. dokumentacja `"use .only to focus"`); fixture'ów testowych (`exclude` domyślnie `**/fixtures/**`); usunięcia testów razem z usunięciem testowanego kodu (refaktor).

**Komunikat (osłabione testy)**: Why: *tests/invoice.test.ts now has 3 assertions instead of 5; removing assertions makes a failing test pass without fixing the code.* Fix: *Restore the removed assertions. If the requirement changed, stop and explain to the human which assertions are obsolete and why.*

---

### scope-guard
| | |
|---|---|
| Kategoria / severity | architecture / **warn** (domyślnie), error opcjonalnie |
| Scope / events / AST | changeset / pre-tool-use, stop / nie |
| Cel | Agent „przy okazji” zmienia 15 plików poza zadaniem, przez co PR jest nie do zreviewowania, a regresje są ukryte. |

**Łapie**
- zapis do pliku spoza aktywnego zakresu zadania, gdy zakres jest zdefiniowany (`.coderail/task.json`: `{ "scope": ["src/billing/**"] }`, ustawiany komendą `coderail task start --scope …` lub ręcznie)
- przekroczenie progu liczby zmienionych plików w drzewie roboczym (`maxChangedFiles`, domyślnie 15) lub linii (`maxChangedLines`, domyślnie 800). Raport w `stop`.

**NIE łapie**: plików zawsze dozwolonych (`docs/**`, `.changeset/**`, `**/*.md` opcjonalnie), plików generowanych (`*.gen.ts`, lockfile'e), braku zdefiniowanego zakresu (wtedy tylko progi).

**Opcje**: `maxChangedFiles`, `maxChangedLines`, `alwaysAllowed: string[]`, `taskFile` (`.coderail/task.json`).

**Komunikat**: Why: *src/auth/session.ts is outside the current task scope (src/billing/**); unrelated changes hide regressions and make review harder.* Fix: *Revert the change to src/auth/session.ts. If it is required for this task, ask the human to extend the scope; otherwise note it as a follow-up.*

---

## Reguły pomocnicze (generowane przez silnik)
| ID | Kiedy | Severity |
|---|---|---|
| `ignore-without-reason` | dyrektywa ignore bez powodu ≥ 10 znaków | warn |
| `ignore-added-by-agent` | dyrektywa ignore dodana w zmianie z hooka | error |
| `internal-rule-error` | crash reguły (raportowany, nie blokuje sam z siebie) | warn |

## Backlog reguł (v2, nie w MVP)
`no-raw-sql-without-tenant`, `require-tenant-on-create`, `endpoint-requires-auth` (Nest/Next route bez guarda), `dto-no-sensitive-fields`, `no-env-in-client`, `no-circular-deps` (dziś robi to dependency-cruiser w samym repo CodeRail), `max-function-complexity-delta`.
