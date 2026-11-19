// Wspólne narzędzia dla hooków Claude Code w tym repozytorium.
// Zasady: zero zależności npm, tylko wbudowane moduły Node 22+, szybki start (<50 ms).
// Hooki NIE mogą się wysypać w sposób blokujący pracę — błąd wewnętrzny = fail-open
// z ostrzeżeniem na stderr (wyjątek: hooki bezpieczeństwa, patrz komentarze w plikach).

import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

/** Katalog główny projektu (Claude Code ustawia CLAUDE_PROJECT_DIR). */
export const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR || process.cwd();

/** Katalog na stan sesji (zadanie, scope). Jest w .gitignore. */
export const STATE_DIR = path.join(PROJECT_DIR, '.claude', 'state');

/** Czyta i parsuje JSON przekazany przez Claude Code na stdin. */
export function readHookInput() {
  try {
    const raw = readFileSync(0, 'utf8');
    return raw.trim() ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Ścieżka względna od katalogu projektu, z ukośnikami "/" (także na Windows). */
export function toRelative(filePath) {
  if (!filePath) return '';
  const abs = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_DIR, filePath);
  return path.relative(PROJECT_DIR, abs).split(path.sep).join('/');
}

/**
 * Minimalny konwerter glob -> RegExp (bez zależności).
 * Obsługuje: ** (dowolne katalogi), * (bez "/"), ? (jeden znak), {a,b}.
 */
export function globToRegExp(glob) {
  let re = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // "**/" = zero lub więcej katalogów
        if (glob[i + 2] === '/') {
          re += '(?:.*/)?';
          i += 2;
        } else {
          re += '.*';
          i += 1;
        }
      } else {
        re += '[^/]*';
      }
    } else if (c === '?') {
      re += '[^/]';
    } else if (c === '{') {
      const end = glob.indexOf('}', i);
      if (end === -1) {
        re += '\\{';
      } else {
        const alts = glob.slice(i + 1, end).split(',').map(escapeRegExp);
        re += `(?:${alts.join('|')})`;
        i = end;
      }
    } else {
      re += escapeRegExp(c);
    }
  }
  return new RegExp(`^${re}$`);
}

function escapeRegExp(s) {
  return s.replace(/[.+^${}()|[\]\\]/g, '\\$&');
}

export function matchesAny(relPath, globs) {
  return globs.some((g) => globToRegExp(g).test(relPath));
}

/** Uruchamia git i zwraca stdout (lub '' przy błędzie). Bez powłoki — brak wstrzyknięć. */
export function git(args, opts = {}) {
  try {
    return execFileSync('git', args, {
      cwd: PROJECT_DIR,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: opts.timeout ?? 3000,
    }).trim();
  } catch {
    return '';
  }
}

export function readJsonSafe(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

export function readTextSafe(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
}

export function ensureStateDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
}

/** Aktualne zadanie zapisane przez skill /start-zadania (lub null). */
export function readCurrentTask() {
  const task = readJsonSafe(path.join(STATE_DIR, 'task.json'));
  // Zadanie oznaczone jako zakończone (/pr ustawia "status": "done") nie jest już aktywne.
  return task && task.status !== 'done' ? task : null;
}

/**
 * Formatuje komunikat w standardzie projektu: blok dla człowieka + dyrektywa dla agenta.
 * Ten sam format będzie miał produkt CodeRail (dogfooding) — patrz docs/07-komunikaty.md.
 */
export function formatViolation({ id, file, why, fix, line }) {
  const where = file ? ` ${file}${line ? `:${line}` : ''}` : '';
  return [
    `[${id}]${where}`,
    `DLACZEGO: ${why}`,
    `NAPRAW: ${fix}`,
  ].join('\n');
}

/** Odpowiedź PreToolUse: odmowa z powodem przekazanym agentowi. */
export function denyPreToolUse(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Odpowiedź PreToolUse: zapytaj człowieka (np. operacje wrażliwe, ale czasem uzasadnione). */
export function askPreToolUse(reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'ask',
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

/** Odpowiedź PostToolUse / Stop: blokada z powodem, który trafia do agenta. */
export function blockWithReason(reason) {
  process.stdout.write(JSON.stringify({ decision: 'block', reason }));
  process.exit(0);
}

/** Dodatkowy kontekst dla agenta po PostToolUse (bez blokowania). */
export function addContext(eventName, text) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: { hookEventName: eventName, additionalContext: text },
    }),
  );
  process.exit(0);
}

export function failOpen(hookName, err) {
  process.stderr.write(`[hook ${hookName}] błąd wewnętrzny (pomijam): ${err?.message ?? err}\n`);
  process.exit(0);
}
