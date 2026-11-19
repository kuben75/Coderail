# Szablon testu reguły

Ilustracja oczekiwanego kształtu. Dostosuj do faktycznych helperów z `tests/helpers/` (jeśli `runRuleOnFixtures` jeszcze nie istnieje, powstaje w zadaniu T-010).

```ts
import { describe, expect, it } from 'vitest';
import { noSecrets } from '../../src/rules/security/no-secrets.js';
import { loadFixtures, runRule } from '../helpers/rule-harness.js';

const fixtures = loadFixtures('no-secrets'); // czyta bad/good/edge + nagłówki "// expect:"

describe('no-secrets', () => {
  describe.each(fixtures.bad)('bad: $name', (fx) => {
    it('reports expected violations', () => {
      const violations = runRule(noSecrets, fx);
      expect(violations.map((v) => ({ ruleId: v.ruleId, line: v.line }))).toStrictEqual(fx.expected);
    });
  });

  describe.each(fixtures.good)('good: $name', (fx) => {
    it(`reports nothing (${fx.whyGood})`, () => {
      expect(runRule(noSecrets, fx)).toStrictEqual([]);
    });
  });

  describe.each(fixtures.edge)('edge: $name', (fx) => {
    it('matches expectation', () => {
      const violations = runRule(noSecrets, fx);
      expect(violations.map((v) => ({ ruleId: v.ruleId, line: v.line }))).toStrictEqual(fx.expected);
    });
  });

  it('redacts the secret in evidence', () => {
    const [v] = runRule(noSecrets, fixtures.byName('anthropic-key-in-const'));
    expect(v?.evidence).toMatch(/^sk-ant-…\(\d+ chars\)$/);
    expect(JSON.stringify(v)).not.toContain('FAKE0000');
  });

  it('agent message points to the concrete file and env variable', () => {
    const [v] = runRule(noSecrets, fixtures.byName('anthropic-key-in-const'));
    expect(v?.message.agent).toContain('anthropic-key-in-const.ts');
    expect(v?.message.agent).toContain('process.env');
  });

  it('reports only changed lines when scope is line', () => {
    const fx = fixtures.byName('aws-key-in-object');
    expect(runRule(noSecrets, { ...fx, changedLines: [{ start: 1, end: 1 }] })).toStrictEqual([]);
  });

  it('handles 100 KB line without catastrophic backtracking', () => {
    const fx = fixtures.byName('very-long-line');
    const t0 = performance.now();
    runRule(noSecrets, fx);
    expect(performance.now() - t0).toBeLessThan(50);
  });
});
```

## Obowiązkowe przypadki poza fixture'ami
1. redakcja `evidence` (reguły security)
2. komunikat agenta zawiera konkret z kontekstu
3. `changedLines` (reguły `scope: 'line'`)
4. ReDoS / długie wejście
5. opcje: wartości domyślne i co najmniej jedna niestandardowa
