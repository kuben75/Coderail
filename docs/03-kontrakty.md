# 03. Kontrakty

To jest **specyfikacja** publicznych typów (implementacja: `src/core/types.ts` w T-010). Po wydaniu 0.1 każda zmiana tutaj jest zmianą łamiącą: wymaga ADR i odpowiedniego changesetu.

## Reguła

```ts
export type RuleCategory = 'security' | 'architecture';
export type Severity = 'error' | 'warn' | 'off';
export type RuleScope = 'line' | 'file' | 'changeset';
export type CheckEvent = 'pre-tool-use' | 'post-tool-use' | 'stop' | 'pre-commit' | 'ci' | 'manual';

export interface RuleMeta<O> {
  readonly id: string;                       // kebab-case, niezmienne po wydaniu
  readonly category: RuleCategory;
  readonly description: string;              // 1 zdanie, EN
  readonly defaultSeverity: Exclude<Severity, 'off'>;
  readonly scope: RuleScope;
  readonly needsAst: boolean;
  readonly events: ReadonlyArray<CheckEvent>;
  readonly optionsSchema: ZodType<O>;        // z wartościami domyślnymi, .strict()
  readonly messages: {
    readonly why: (params: MessageParams) => string;   // ≤ 220 znaków
    readonly fix: (params: MessageParams) => string;   // ≤ 400 znaków
  };
}

export interface Rule<O = unknown> {
  readonly meta: RuleMeta<O>;
  /** Czysta funkcja. Bez I/O, bez stanu, deterministyczna. */
  check(ctx: CheckContext, options: O): ReadonlyArray<Violation>;
}
```

Reguły `scope: 'changeset'` implementują dodatkowo `checkChangeset(ctx: ChangesetContext, options: O)` i dostają wszystkie zmienione pliki naraz (np. `scope-guard`, usunięte asercje w `no-ai-cheats`).

## Kontekst sprawdzania

```ts
export interface LineRange { readonly start: number; readonly end: number } // 1-based, włącznie

export interface CheckContext {
  readonly event: CheckEvent;
  readonly file: {
    readonly path: string;          // względna do katalogu projektu, separator "/"
    readonly content: string;       // treść PO zmianie (dla pre-tool-use: zasymulowana)
    readonly previousContent: string | null; // treść przed zmianą (null = nowy plik)
    readonly language: 'ts' | 'tsx' | 'js' | 'jsx' | 'other';
  };
  /** Zakresy linii dodanych/zmienionych. 'all' = cały plik (np. `check` bez --staged). */
  readonly changedLines: ReadonlyArray<LineRange> | 'all';
  readonly project: { readonly root: string; readonly config: ResolvedConfig };
  /** Leniwy, współdzielony AST (parsowany przy pierwszym wywołaniu, cache na uruchomienie). */
  ast(): SourceFileAst;
  // helpery (implementowane przez core, nie przez reguły):
  lineOf(index: number): number;
  columnOf(index: number): number;
  isIgnored(line: number, ruleId: string): IgnoreDirective | null;
  violation(input: ViolationInput): Violation;
}
```

## Naruszenie

```ts
export interface Violation {
  readonly ruleId: string;
  readonly category: RuleCategory;
  readonly severity: Exclude<Severity, 'off'>;
  readonly file: string;
  readonly line: number;            // 1-based
  readonly column: number;          // 1-based
  readonly message: { readonly human: string; readonly agent: string };
  /** Krótki dowód. Dla sekretów ZAWSZE zredagowany (np. "sk-ant-…(48 chars)"). */
  readonly evidence?: string;
}
```

Kolejność wyników jest deterministyczna: `(file, line, column, ruleId)`.

## Wynik silnika

```ts
export interface EngineResult {
  readonly violations: ReadonlyArray<Violation>;
  readonly ruleErrors: ReadonlyArray<{ ruleId: string; file: string; error: string }>; // crash reguły, izolowany
  readonly stats: { readonly files: number; readonly rules: number; readonly durationMs: number; readonly astParsed: number };
}

export type Decision =
  | { readonly kind: 'allow' }
  | { readonly kind: 'block'; readonly violations: ReadonlyArray<Violation> }       // ≥1 error
  | { readonly kind: 'warn'; readonly violations: ReadonlyArray<Violation> };       // tylko warn
```

## Konfiguracja (skrót, pełny opis: `06-konfiguracja.md`)

```ts
export interface Config {
  extends?: PresetName | ReadonlyArray<PresetName>;
  include?: ReadonlyArray<string>;                 // globy, domyślnie src/**, app/**, lib/**, …
  exclude?: ReadonlyArray<string>;                 // domyślnie node_modules, dist, build, .next, coverage
  failMode?: 'open' | 'closed';                    // domyślnie 'open'
  rules?: Partial<Record<RuleId, Severity | [Severity, RuleOptions]>>;
  layers?: ReadonlyArray<{ name: string; paths: ReadonlyArray<string>; allow: ReadonlyArray<string> }>;
  protectedPaths?: ReadonlyArray<{ glob: string; reason: string; allowWith?: 'human-flag' }>;
  tenancy?: { orm: 'prisma' | 'drizzle'; scopeFields: ReadonlyArray<string>; models: ReadonlyArray<string> };
}
export function defineConfig(config: Config): Config;
```

## Błędy

```ts
export type ErrorCode =
  | 'CONFIG_NOT_FOUND' | 'CONFIG_INVALID' | 'CONFIG_LOAD_FAILED'
  | 'HOOK_INPUT_INVALID' | 'HOOK_EVENT_UNSUPPORTED'
  | 'RULE_CRASHED' | 'RULE_UNKNOWN'
  | 'GIT_UNAVAILABLE' | 'GIT_TIMEOUT'
  | 'PATH_OUTSIDE_PROJECT'
  | 'INTERNAL';

export class CodeRailError extends Error {
  constructor(readonly code: ErrorCode, message: string, readonly details?: Readonly<Record<string, unknown>>);
}
```

## Kody wyjścia CLI

| Kod | `check` | `hook` | `init` / `explain` |
|---|---|---|---|
| 0 | brak naruszeń `error` | przepuszczone (także: tylko `warn`, albo błąd wewnętrzny przy `failMode: open`) | sukces |
| 1 | są naruszenia `error` | — | — |
| 2 | — | **blokada**, komunikat na stderr | — |
| 3 | błąd użycia / configu | błąd configu przy `failMode: closed` (przy `open`: exit 0 + ostrzeżenie) | błąd użycia |
| 4 | błąd wewnętrzny | błąd wewnętrzny przy `failMode: closed` | błąd wewnętrzny |

Uwaga: w trybie `hook` przy `failMode: closed` błąd wewnętrzny daje **exit 2** z komunikatem „CodeRail internal error, blocking because failMode=closed”. Kod 4 nie zablokowałby Claude Code (dla większości zdarzeń kod inny niż 0 i 2 jest błędem niblokującym). Szczegóły w `05-integracja-claude-code.md`.

## Dyrektywa ignorowania

```ts
// coderail-ignore-next-line <rule-id>[, <rule-id>] -- <powód (wymagany, ≥ 10 znaków)>
```
Ignore bez powodu jest ignorowany i sam generuje naruszenie `ignore-without-reason` (severity `warn`). Ignore dodany w zmianie przychodzącej z hooka agenta (`pre-tool-use`, `post-tool-use`) nie jest respektowany i generuje `ignore-added-by-agent` (`error`). Agent nie może wyciszać barier, ignore dodaje człowiek. Ignore dla całego pliku nie istnieje w MVP. Zamiast tego służy `exclude` w configu, czyli decyzja jawna i reviewowalna.
