# 01. Wizja i zakres

## Problem
Agenci AI (Claude Code, Cursor, Codex) dostają reguły projektu w plikach Markdown (`CLAUDE.md`, `.cursor/rules`, `AGENTS.md`). Dla modelu to **kontekst, nie egzekwowana konfiguracja**. Gdy kontekst się zapełnia, a agent skupia się na zamknięciu zadania, regularnie:
- wkleja klucz API w kod albo czyta `.env`,
- importuje klienta bazy danych w komponencie UI,
- pomija izolację danych tenantów (`where` bez `tenantId`),
- „naprawia” czerwony test przez `.skip`, `as any`, `@ts-ignore` albo usunięcie asercji,
- zmienia pliki spoza zadania, w tym stare migracje i konfigurację auth.

Hooki Claude Code pozwalają to blokować deterministycznie, ale każdy pisze je od zera, jako kruche skrypty bash z `jq` i regexem, bez testów i bez dobrych komunikatów.

## Rozwiązanie
**CodeRail**: lokalne CLI, które:
1. jednym `npx coderail init` wykrywa stack i spina hooki Claude Code oraz git pre-commit,
2. egzekwuje **mały zestaw precyzyjnych reguł** (bezpieczeństwo + architektura + anti-cheat),
3. przy blokadzie zwraca komunikat w dwóch blokach: **Why** (człowiek uczy się na żywym kodzie) i **Fix** (agent dostaje dyrektywę i sam się poprawia).

## Dla kogo
- **Główny użytkownik**: solo developer lub mały zespół budujący SaaS w TypeScript (Next.js, NestJS/Node, Prisma/Drizzle) z Claude Code.
- **Ich ból**: „AI szybko pisze kod, ale nie ufam mu w bezpieczeństwie i architekturze, więc każdą zmianę czytam linijka po linijce”.
- **Obietnica**: „Wpuść Claude Code do repo. Najgroźniejsze błędy nie przejdą, a agent sam je poprawi”.

## Wyróżniki (dlaczego nie ESLint / gitleaks / gotowe hooki)
| Co | ESLint | gitleaks | ręczne hooki | **CodeRail** |
|---|---|---|---|---|
| działa w pętli agenta (PreToolUse, przed zapisem) | ✗ | ✗ | ✓ | ✓ |
| diff-aware (tylko nowe naruszenia) | ✗ | częściowo | rzadko | ✓ |
| reguły specyficzne dla AI (osłabione testy, scope) | ✗ | ✗ | rzadko | ✓ |
| tenant scope w Prisma/Drizzle | ✗ | ✗ | ✗ | ✓ |
| komunikat naprawczy dla agenta + why dla człowieka | ✗ | ✗ | ✗ | ✓ |
| testowane fixture'ami, zero FP jako cel | częściowo | ✓ | ✗ | ✓ |

**Nie konkurujemy** z narzędziami do synchronizacji reguł między agentami (Ruler, rulesync) ani z pełnymi linterami. Uzupełniamy je.

## Zakres MVP (v0.1)
| Wchodzi | Uwagi |
|---|---|
| TypeScript/JavaScript | `.ts .tsx .mts .cts .js .jsx .mjs` |
| Claude Code hooks + git pre-commit + `check` w CI | jedno źródło reguł dla trzech punktów |
| 7 reguł: `no-secrets`, `protected-paths`, `require-tenant-scope`, `no-sensitive-logging`, `layer-boundaries`, `no-ai-cheats`, `scope-guard` | `docs/04-katalog-regul.md` |
| 3 presety: `node-api`, `nextjs-app`, `strict-saas` | |
| `init`, `check`, `hook`, `explain` | |
| 100% lokalnie, zero sieci, zero LLM | |

## Świadomie NIE robimy w v1 (i dlaczego)
| Nie robimy | Dlaczego |
|---|---|
| Python, Go, Rust… | najpierw udowodnić wartość w jednym ekosystemie |
| wtyczki VS Code/JetBrains/Cursor | hooki Claude Code + git pokrywają pętlę agenta |
| 50 ogólnych reguł | dublowałyby ESLint; każda reguła to koszt utrzymania i ryzyko FP |
| dashboard, konta, chmura, telemetria | zero kosztów utrzymania, zero ryzyka prywatności, zaufanie |
| LLM oceniający kod | opóźnienie, koszt, niedeterminizm, czyli zaprzeczenie produktu |
| synchronizacja reguł między agentami | istnieją dobre narzędzia (Ruler, rulesync) |
| automatyczne poprawki (autofix) | naprawia agent na podstawie Fix; autofix to v2 |

## Kryteria sukcesu MVP
- `npx coderail init` → działające hooki w < 2 min na czystym repo Next.js + Prisma
- 0 zgłoszonych FP na własnych projektach autora przez 2 tygodnie używania
- w 5 scenariuszach `/test-hooka` agent poprawia się w pierwszej próbie po komunikacie w ≥ 4/5
- hook p95 < 300 ms (z AST), < 80 ms (bez AST)

## Model biznesowy (hipoteza, po MVP)
- **Core (MIT, npm)**: CLI + reguły z MVP. Silnik dystrybucji: 30-sekundowe demo „agent próbuje wycieku → blokada → sam poprawia”.
- **Pro (płatne, później)**: zaawansowane reguły (multi-tenant w złożonych przypadkach, audyt endpointów auth/walidacji, wycieki w DTO) + starter kit Next.js/Nest + Auth + Prisma spięty z CodeRail.
- Decyzja o Pro zapada dopiero po realnych użytkownikach Core. Do tego czasu nie piszemy kodu „pod Pro”.
