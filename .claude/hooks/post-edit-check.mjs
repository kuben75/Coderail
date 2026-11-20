#!/usr/bin/env node
// PostToolUse(Edit|Write|MultiEdit): szybkie kontrole po zapisie pliku (budżet: <150 ms).
//  1. Anti-cheat: nowe @ts-ignore, eslint-disable, `any`, .only/.skip itd.
//  2. Osłabianie testów: mniej asercji / mniej przypadków testowych niż przed zmianą.
//  3. Granice warstw: importy łamiące architekturę (docs/02-architektura.md).
//  4. Higiena: console.* i process.exit poza warstwą CLI.
// To ręczna, uproszczona wersja reguł, które CodeRail będzie egzekwował sam (dogfooding).
// Gdy CodeRail dojdzie do Etapu 2, ten hook zostanie zastąpiony przez `coderail hook post-tool-use`.

import path from 'node:path';
import {
  readHookInput, toRelative, matchesAny, readTextSafe, git,
  blockWithReason, addContext, formatViolation, failOpen, PROJECT_DIR,
} from './lib/common.mjs';

const CODE_GLOBS = ['src/**/*.{ts,tsx,mts,cts,js,mjs}', 'tests/**/*.{ts,tsx,mts,js,mjs}', 'scripts/**/*.{ts,mjs,js}', '*.config.{ts,mjs,js}'];
// Fixture'y ZAWIERAJĄ celowo zły kod — to materiał testowy reguł. Nie sprawdzamy ich.
const EXEMPT_GLOBS = ['tests/fixtures/**', '**/*.d.ts', 'dist/**', 'node_modules/**'];
const TEST_GLOBS = ['tests/**/*.test.{ts,mts}', 'src/**/*.test.{ts,mts}'];

// [id, regex (globalny, liczymy wystąpienia), dlaczego, jak naprawić]
const CHEATS = [
  ['ts-ignore', /@ts-ignore|@ts-nocheck/g,
    'Wyciszanie kompilatora ukrywa błąd typów zamiast go naprawić.',
    'Napraw typ. Jeśli to błąd w typach zewnętrznej biblioteki, użyj `// @ts-expect-error <powód min. 10 znaków>` i zgłoś to w podsumowaniu.'],
  ['ts-expect-error-bare', /@ts-expect-error(?![ \t]*[:\-–]?[ \t]*\S.{9,})/g,
    '@ts-expect-error bez uzasadnienia to @ts-ignore w przebraniu.',
    'Dopisz konkretny powód w tej samej linii albo usuń dyrektywę i napraw typ.'],
  ['eslint-disable', /eslint-disable/g,
    'Wyłączanie lintera omija ustalone reguły projektu.',
    'Popraw kod tak, by spełniał regułę. Jeśli reguła jest błędna dla całego projektu — zaproponuj zmianę konfiguracji człowiekowi.'],
  ['any', /\bas\s+any\b|:\s*any\b(?!\w)|<any>|\bany\[\]/g,
    '`any` wyłącza sprawdzanie typów (strict: true jest zasadą projektu).',
    'Użyj konkretnego typu, `unknown` + zawężenie (type guard), albo generyka.'],
  ['double-cast', /\bas\s+unknown\s+as\b/g,
    'Podwójne rzutowanie `as unknown as` zmusza kompilator do zaakceptowania kłamstwa o typie.',
    'Zawęź typ walidacją (zod / type guard) zamiast rzutować.'],
  ['focused-or-skipped-test', /\b(it|test|describe|bench)\.(only|skip|todo|skipIf|runIf)\b|\b(xit|xtest|xdescribe|fit|fdescribe)\s*\(/g,
    'Pominięte lub zawężone testy fałszywie zielenią zestaw testów.',
    'Usuń .only/.skip. Jeśli test nie przechodzi — napraw kod albo opisz człowiekowi, dlaczego wymaganie jest błędne.'],
  ['non-null-assertion-chain', /!\.\w+!\./g,
    'Łańcuch non-null assertions (`a!.b!.c`) ukrywa realne przypadki null/undefined.',
    'Obsłuż brak wartości jawnie (early return, optional chaining z wartością domyślną).'],
];

// Granice warstw: dla plików w danej warstwie — zakazane cele importów.
const LAYERS = [
  { name: 'core', glob: 'src/core/**',
    forbiddenInternal: ['src/cli/', 'src/adapters/', 'src/rules/', 'src/presets/'],
    forbiddenExternal: [/^node:(fs|child_process|process|os|net|http|https)/, /^(fs|child_process)$/, /^(commander|@clack\/prompts|picocolors|chalk)$/],
    why: 'Rdzeń (core) jest czystą logiką: nie wie nic o terminalu, systemie plików, gicie ani Claude Code. Dzięki temu jest szybki i testowalny bez mocków.',
    fix: 'Zdefiniuj port (interfejs) w src/core/ports.ts i wstrzyknij implementację z src/adapters/ przez CLI (composition root w src/cli/).' },
  { name: 'rules', glob: 'src/rules/**',
    forbiddenInternal: ['src/cli/', 'src/adapters/', 'src/presets/'],
    forbiddenExternal: [/^node:(fs|child_process|process|os|net|http|https)/, /^(fs|child_process)$/, /^(commander|@clack\/prompts|picocolors|chalk)$/],
    why: 'Reguła to czysta funkcja (CheckContext) => Violation[]. Nie czyta plików ani nie uruchamia procesów — dostaje wszystko w kontekście.',
    fix: 'Potrzebne dane dodaj do CheckContext (src/core/types.ts), a ich pobranie do adaptera. Reguła ma tylko analizować.' },
  { name: 'presets', glob: 'src/presets/**',
    forbiddenInternal: ['src/cli/', 'src/adapters/'],
    forbiddenExternal: [/^node:/],
    why: 'Presety to dane (konfiguracja), nie logika z efektami ubocznymi.',
    fix: 'Preset zwraca obiekt konfiguracji. Wykrywanie stacku należy do src/adapters/stack-detector.ts.' },
  { name: 'adapters', glob: 'src/adapters/**',
    forbiddenInternal: ['src/cli/', 'src/rules/'],
    forbiddenExternal: [/^(commander|@clack\/prompts)$/],
    why: 'Adaptery implementują porty z core. Nie zależą od CLI ani od konkretnych reguł.',
    fix: 'Przenieś logikę prezentacji do src/cli/, a logikę reguły do src/rules/.' },
];

const IMPORT_RE = /(?:^|[\s;])(?:import|export)\s+(?:type\s+)?(?:[^'";]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\)/g;

function count(re, text) {
  if (!text) return 0;
  re.lastIndex = 0;
  return (text.match(re) ?? []).length;
}

function beforeAndAfter(input, rel) {
  const ti = input.tool_input ?? {};
  if (typeof ti.old_string === 'string' && typeof ti.new_string === 'string') {
    return { before: ti.old_string, after: ti.new_string };
  }
  if (Array.isArray(ti.edits)) {
    return {
      before: ti.edits.map((e) => e?.old_string ?? '').join('\n'),
      after: ti.edits.map((e) => e?.new_string ?? '').join('\n'),
    };
  }
  // Write: porównujemy z wersją z HEAD (nowy plik => pusta wersja bazowa)
  const before = git(['show', `HEAD:${rel}`]) || '';
  const after = typeof ti.content === 'string' ? ti.content : readTextSafe(path.join(PROJECT_DIR, rel)) ?? '';
  return { before, after };
}

function lineOf(text, re) {
  re.lastIndex = 0;
  const m = re.exec(text);
  return m ? text.slice(0, m.index).split('\n').length : undefined;
}

try {
  const input = readHookInput();
  const rawPath = input?.tool_input?.file_path ?? '';
  if (!rawPath) process.exit(0);
  const rel = toRelative(rawPath);
  if (!matchesAny(rel, CODE_GLOBS) || matchesAny(rel, EXEMPT_GLOBS)) process.exit(0);

  const { before, after } = beforeAndAfter(input, rel);
  const violations = [];
  const warnings = [];

  // 1. Anti-cheat — liczymy tylko NOWE wystąpienia (diff-aware, zero kary za stary kod)
  for (const [id, re, why, fix] of CHEATS) {
    if (count(re, after) > count(re, before)) {
      violations.push(formatViolation({ id: `cheat/${id}`, file: rel, why, fix }));
    }
  }

  // 2. Osłabianie testów
  if (matchesAny(rel, TEST_GLOBS)) {
    const fullAfter = readTextSafe(path.join(PROJECT_DIR, rel)) ?? after;
    const fullBefore = git(['show', `HEAD:${rel}`]);
    if (fullBefore) {
      const asserts = /\bexpect(?:\.soft)?\s*\(|\bassert(?:\.\w+)?\s*\(|\.toThrow/g;
      const cases = /\b(it|test)\s*(?:\.each\s*\([^)]*\))?\s*\(/g;
      const a0 = count(asserts, fullBefore), a1 = count(asserts, fullAfter);
      const c0 = count(cases, fullBefore), c1 = count(cases, fullAfter);
      if (a1 < a0 || c1 < c0) {
        violations.push(formatViolation({
          id: 'cheat/weakened-tests', file: rel,
          why: `Plik testowy ma mniej asercji (${a0} → ${a1}) lub przypadków (${c0} → ${c1}) niż w HEAD. Usuwanie asercji to najczęstszy sposób, w jaki agent „naprawia” czerwony test.`,
          fix: 'Przywróć usunięte asercje/testy. Jeśli zmiana wymagań naprawdę je unieważnia, NIE usuwaj ich sam — wypisz człowiekowi listę i powód, i poczekaj na zgodę.',
        }));
      }
    }
    const weak = /expect\([^)]*\)\.(toBeTruthy|toBeDefined|not\.toBeNull)\(\)/g;
    if (count(weak, after) > count(weak, before)) {
      warnings.push(`[test/weak-assertion] ${rel}: nowe słabe asercje (toBeTruthy/toBeDefined). Sprawdzaj konkretną wartość: toEqual/toStrictEqual/toMatchObject.`);
    }
  }

  // 3. Granice warstw (sprawdzamy cały plik po zapisie — import mógł zostać dodany w innej edycji)
  const layer = LAYERS.find((l) => matchesAny(rel, [l.glob]));
  if (layer && !matchesAny(rel, TEST_GLOBS)) {
    const full = readTextSafe(path.join(PROJECT_DIR, rel)) ?? after;
    IMPORT_RE.lastIndex = 0;
    let m;
    const bad = new Set();
    while ((m = IMPORT_RE.exec(full))) {
      const spec = m[1] ?? m[2] ?? m[3];
      if (!spec) continue;
      if (spec.startsWith('.')) {
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(rel), spec));
        if (layer.forbiddenInternal.some((p) => target.startsWith(p) || `${target}/`.startsWith(p))) bad.add(spec);
      } else if (layer.forbiddenExternal.some((re) => re.test(spec))) {
        bad.add(spec);
      }
    }
    if (bad.size) {
      violations.push(formatViolation({
        id: `arch/layer-boundary(${layer.name})`, file: rel,
        why: `${layer.why} Zakazane importy: ${[...bad].join(', ')}.`,
        fix: layer.fix,
      }));
    }
  }

  // 4. Higiena wyjścia: tylko warstwa CLI pisze na terminal i kończy proces
  if (matchesAny(rel, ['src/**']) && !matchesAny(rel, ['src/cli/**', ...TEST_GLOBS])) {
    const consoleRe = /\bconsole\.(log|info|warn|error|debug)\s*\(/g;
    const exitRe = /\bprocess\.exit\s*\(/g;
    if (count(consoleRe, after) > count(consoleRe, before)) {
      violations.push(formatViolation({
        id: 'arch/no-console-outside-cli', file: rel, line: lineOf(after, consoleRe),
        why: 'Wyjście na stdout/stderr ma format kontraktowy (Claude Code czyta stderr przy exit 2). Losowe console.log psuje ten kontrakt.',
        fix: 'Zwróć dane (np. Violation[] lub Result) do warstwy CLI; formatowanie robi src/cli/output.ts.',
      }));
    }
    if (count(exitRe, after) > count(exitRe, before)) {
      violations.push(formatViolation({
        id: 'arch/no-exit-outside-cli', file: rel, line: lineOf(after, exitRe),
        why: 'Kod wyjścia to kontrakt z Claude Code (0/1/2). Tylko CLI decyduje, kiedy i z jakim kodem zakończyć proces.',
        fix: 'Zwróć wynik lub rzuć typowany błąd (CodeRailError); mapowanie na exit code robi src/cli/.',
      }));
    }
  }

  if (violations.length) {
    blockWithReason(
      `Hook post-edit wykrył ${violations.length} problem(y) w zapisanym pliku. Popraw je teraz, zanim przejdziesz dalej:\n\n` +
        violations.join('\n\n') +
        (warnings.length ? `\n\nOstrzeżenia:\n${warnings.join('\n')}` : ''),
    );
  }
  if (warnings.length) addContext('PostToolUse', warnings.join('\n'));
  process.exit(0);
} catch (err) {
  failOpen('post-edit-check', err);
}
