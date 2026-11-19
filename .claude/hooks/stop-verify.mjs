#!/usr/bin/env node
// Stop: zanim agent ogłosi „gotowe”, sprawdzamy Definition of Done dla zmienionych plików.
//  1. Szybka weryfikacja (`npm run verify:fast`: typecheck + lint + testy zmienionych plików).
//  2. Spójność zmian: nowa/zmieniona reguła => testy + fixture'y + katalog w docs.
//  3. Przypomnienie o changesecie przy zmianach w src/.
// Jeśli coś nie gra — blokujemy zakończenie i oddajemy agentowi konkretną listę do naprawy.
// stop_hook_active=true oznacza, że już raz zablokowaliśmy — wtedy przepuszczamy, żeby nie zapętlić sesji.

import { existsSync, writeFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import {
  readHookInput, git, readJsonSafe, matchesAny, blockWithReason, failOpen, PROJECT_DIR, formatViolation,
  STATE_DIR, ensureStateDir,
} from './lib/common.mjs';

const CACHE_FILE = path.join(STATE_DIR, 'last-verify.json');

/** Odcisk stanu drzewa roboczego — jeśli się nie zmienił od ostatniej udanej weryfikacji, nie powtarzamy jej. */
function fingerprint(files) {
  const h = createHash('sha1');
  h.update(git(['diff', 'HEAD'], { timeout: 5000 }));
  for (const f of files.sort()) {
    try { h.update(`${f}:${statSync(path.join(PROJECT_DIR, f)).mtimeMs}`); } catch { h.update(`${f}:deleted`); }
  }
  return h.digest('hex');
}

try {
  const input = readHookInput();
  if (input.stop_hook_active === true) process.exit(0);

  // Zmienione pliki: niezacommitowane + nieśledzone (względem HEAD)
  const changed = new Set(
    [
      ...git(['diff', '--name-only', 'HEAD']).split('\n'),
      ...git(['ls-files', '--others', '--exclude-standard']).split('\n'),
    ].filter(Boolean),
  );
  if (changed.size === 0) process.exit(0);
  const files = [...changed];
  const codeChanged = files.some((f) => matchesAny(f, ['src/**', 'tests/**', '*.config.{ts,mjs,js}', 'package.json', 'tsconfig*.json']));

  const problems = [];

  // 2. Spójność zmian w regułach
  const ruleFiles = files.filter((f) => matchesAny(f, ['src/rules/*/*.ts']) && !f.endsWith('.test.ts') && !f.endsWith('index.ts'));
  for (const rf of ruleFiles) {
    const ruleId = path.posix.basename(rf, '.ts');
    const hasTest = files.some((f) => f.includes(`tests/rules/`) && f.includes(ruleId)) ||
      existsSync(path.join(PROJECT_DIR, 'tests', 'rules', `${ruleId}.test.ts`));
    const testTouched = files.some((f) => f.includes('tests/') && f.includes(ruleId));
    if (!hasTest) {
      problems.push(formatViolation({
        id: 'dod/rule-without-tests', file: rf,
        why: 'Reguła bez testów na fixture\'ach to reguła, której fałszywe alarmy wyjdą dopiero u użytkownika.',
        fix: `Dodaj tests/rules/${ruleId}.test.ts oraz fixture'y w tests/fixtures/${ruleId}/{bad,good}/ (skill /nowa-regula, krok 3).`,
      }));
    } else if (!testTouched) {
      problems.push(formatViolation({
        id: 'dod/rule-changed-tests-not', file: rf,
        why: 'Zmieniono logikę reguły, ale nie dodano ani nie zmieniono żadnego testu/fixture\'a.',
        fix: `Dodaj fixture odtwarzający zmienione zachowanie (bad/ lub good/) w tests/fixtures/${ruleId}/ i asercję w teście.`,
      }));
    }
    const isNew = !git(['ls-files', '--', rf]);
    if (isNew && !files.includes('docs/04-katalog-regul.md')) {
      problems.push(formatViolation({
        id: 'dod/rule-not-in-catalog', file: rf,
        why: 'Nowa reguła musi mieć specyfikację w katalogu — to umowa z użytkownikiem, co reguła łapie, a czego nie.',
        fix: 'Dodaj sekcję reguły w docs/04-katalog-regul.md według szablonu z tego pliku.',
      }));
    }
  }

  // 3. Changeset
  const srcChanged = files.some((f) => matchesAny(f, ['src/**']) && !f.endsWith('.test.ts'));
  const hasChangeset = files.some((f) => matchesAny(f, ['.changeset/*.md']) && !f.endsWith('README.md'));
  if (srcChanged && !hasChangeset && existsSync(path.join(PROJECT_DIR, '.changeset'))) {
    problems.push(formatViolation({
      id: 'dod/missing-changeset',
      why: 'Zmiana w src/ wpływa na użytkowników paczki i musi trafić do CHANGELOG.',
      fix: 'Utwórz plik .changeset/<krótka-nazwa>.md (format w docs/10-git-workflow.md). Dla czysto wewnętrznych refaktorów użyj pustego changesetu i napisz to w opisie.',
    }));
  }

  // 1. Weryfikacja techniczna (tylko gdy ruszono kod i skrypt istnieje)
  const pkg = readJsonSafe(path.join(PROJECT_DIR, 'package.json'));
  const fp = fingerprint(files);
  const cached = readJsonSafe(CACHE_FILE);
  if (codeChanged && pkg?.scripts?.['verify:fast'] && cached?.fingerprint !== fp) {
    const res = spawnSync('npm', ['run', '--silent', 'verify:fast'], {
      cwd: PROJECT_DIR, encoding: 'utf8', timeout: 170_000, shell: process.platform === 'win32',
    });
    if (res.status !== 0) {
      const out = `${res.stdout ?? ''}\n${res.stderr ?? ''}`.trim().split('\n').slice(-60).join('\n');
      problems.unshift(formatViolation({
        id: 'dod/verify-fast-failed',
        why: res.error?.code === 'ETIMEDOUT' ? '`npm run verify:fast` przekroczył limit czasu (170 s).' : '`npm run verify:fast` nie przechodzi.',
        fix: `Napraw błędy poniżej (nie wyciszaj ich, nie pomijaj testów):\n${out}`,
      }));
    } else {
      ensureStateDir();
      writeFileSync(CACHE_FILE, JSON.stringify({ fingerprint: fp, at: new Date().toISOString() }));
    }
  }

  if (problems.length) {
    blockWithReason(
      `Zadanie nie spełnia Definition of Done (docs/11-praca-z-agentem.md). Nie kończ jeszcze — popraw:\n\n${problems.join('\n\n')}\n\n` +
        'Jeśli uważasz, że któryś punkt jest błędny w tym konkretnym przypadku, napisz to człowiekowi wprost i zakończ — nie obchodź kontroli.',
    );
  }
  process.exit(0);
} catch (err) {
  failOpen('stop-verify', err);
}
