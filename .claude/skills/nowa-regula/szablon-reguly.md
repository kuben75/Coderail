# Szablon reguły

Ilustracja kształtu zgodnego z `docs/03-kontrakty.md`. Jeśli kontrakt w `src/core/types.ts` różni się od tego szablonu, **obowiązuje kod**. Wtedy zgłoś rozbieżność człowiekowi (do poprawy w docs).

```ts
import { z } from 'zod';
import type { CheckContext, Rule, Violation } from '../../core/types.js';
import { isLineChanged, findIgnoreDirective } from '../../core/diff.js';
import { redact } from '../../core/redact.js';

const optionsSchema = z
  .object({
    /** Dodatkowe wzorce sekretów użytkownika (kompilowane z limitem, patrz bezpieczenstwo-narzedzia.md). */
    extraPatterns: z.array(z.object({ name: z.string(), pattern: z.string().max(200) })).default([]),
    /** Ścieżki wyłączone z reguły. Domyślnie PUSTE: katalog "fixtures" w repo użytkownika też może ukrywać prawdziwy klucz.
     *  Wartości z markerem FAKE/EXAMPLE w samym tokenie są ignorowane zawsze (patrz docs/04). */
    allowIn: z.array(z.string()).default([]),
  })
  .strict();

type Options = z.infer<typeof optionsSchema>;

// Regexy kompilowane RAZ, na poziomie modułu. Bez zagnieżdżonych kwantyfikatorów.
const PATTERNS = [
  { name: 'Anthropic API key', prefix: 'sk-ant-', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  // ...
] as const;

export const noSecrets: Rule<Options> = {
  meta: {
    id: 'no-secrets',
    category: 'security',
    description: 'Disallow hardcoded API keys, tokens, private keys and credentials in source code.',
    defaultSeverity: 'error',
    scope: 'line',
    needsAst: false,
    events: ['pre-tool-use', 'pre-commit', 'ci'],
    optionsSchema,
    messages: {
      why: ({ kind }) => `A hardcoded ${kind} ends up in git history and leaks to anyone with repo access, even after you delete it.`,
      fix: ({ file, kind, envName }) =>
        `Remove the ${kind} from ${file}. Read it from \`process.env.${envName}\` and document the variable (without value) in .env.example.`,
    },
  },

  check(ctx: CheckContext, options: Options): Violation[] {
    const { content, path } = ctx.file;
    // 1. Pre-filtr: tani test, zanim uruchomimy jakikolwiek regex
    if (!PATTERNS.some((p) => content.includes(p.prefix))) return [];

    const violations: Violation[] = [];
    for (const p of PATTERNS) {
      p.re.lastIndex = 0;
      for (const m of content.matchAll(p.re)) {
        const line = ctx.lineOf(m.index);
        if (!isLineChanged(ctx, line)) continue;
        if (findIgnoreDirective(ctx, line, 'no-secrets')) continue;
        violations.push(
          ctx.violation({
            line,
            column: ctx.columnOf(m.index),
            evidence: redact(m[0], p.prefix),
            params: { file: path, kind: p.name, envName: suggestEnvName(p.name) },
          }),
        );
      }
    }
    return violations;
  },
};

function suggestEnvName(kind: string): string {
  return kind.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/_KEY$/, '') + '_KEY';
}
```

## Zasady z szablonu
- `meta` kompletne. `optionsSchema` z `.strict()` i wartościami domyślnymi.
- Pre-filtr przed regexem/AST.
- `ctx.violation()` (helper z core) uzupełnia `ruleId`, `severity`, `file` i komunikaty. Reguła podaje tylko pozycję, `evidence` i parametry.
- Respektowanie `changedLines` i `coderail-ignore-next-line`.
- Brak I/O, brak `console`, brak stanu poza stałymi modułu.
