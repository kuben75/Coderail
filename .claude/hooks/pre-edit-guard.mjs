#!/usr/bin/env node
// PreToolUse(Edit|Write|MultiEdit|NotebookEdit): ostatnia linia obrony przed zapisem.
//  1. Pliki z sekretami (.env, klucze) — zakaz.
//  2. Pliki chronione (konfiguracja agenta, hooki, CI, lockfile, zaakceptowane ADR) — zakaz lub pytanie.
//  3. Sekrety w treści zapisu (poza tests/fixtures/**, gdzie żyją CELOWO fałszywe sekrety).
//  4. Brak aktywnego zadania albo gałąź główna — zakaz zapisu (poza .claude/state/**).
//  5. Scope guard — zapis poza zakresem aktualnego zadania (.claude/state/task.json).
// Uprawnienia w .claude/settings.json dublują część reguł (obrona warstwowa).

import path from 'node:path';
import {
  readHookInput, toRelative, matchesAny, readTextSafe, readCurrentTask, currentBranch,
  denyPreToolUse, askPreToolUse, formatViolation, failOpen, PROJECT_DIR,
} from './lib/common.mjs';

const PROTECTED_BRANCHES = ['main', 'master'];
// Stan sesji (task.json, plan.md, followups.md, handoff.md) agent zapisuje zawsze.
const STATE_GLOBS = ['.claude/state/**'];

// --- 1. Pliki, których agent nigdy nie zapisuje ---
const FORBIDDEN = [
  { globs: ['.env', '**/.env', '.env.*', '**/.env.*'], except: ['.env.example', '**/.env.example'],
    why: 'Pliki .env zawierają prawdziwe sekrety. Agent nie może ich tworzyć ani zmieniać.',
    fix: 'Jeśli potrzebna jest nowa zmienna, dopisz ją (bez wartości) do .env.example i poproś człowieka o uzupełnienie .env.' },
  { globs: ['**/*.pem', '**/*.key', '**/*.p12', '**/id_rsa*', '**/id_ed25519*', '**/.npmrc'],
    why: 'Klucze prywatne i tokeny rejestru (.npmrc) nie mogą trafić do repozytorium ani być edytowane przez agenta.',
    fix: 'Zrezygnuj z zapisu. Konfigurację tokenów robi człowiek poza repozytorium.' },
];

// --- 2. Pliki chronione ---
const PROTECTED = [
  { globs: ['.claude/settings.json', '.claude/settings.local.json', '.claude/hooks/**', '.githooks/**'], decision: 'deny',
    why: 'To mechanizmy kontrolujące agenta. Agent, który może je zmieniać, może wyłączyć własne bariery.',
    fix: 'Nie zmieniaj ich. Jeśli hook daje fałszywy alarm albo blokuje słuszną zmianę, opisz to człowiekowi (plik, komunikat, dlaczego to błąd).' },
  { globs: ['CLAUDE.md', '.claude/rules/**', '.claude/skills/**', '.claude/agents/**'], decision: 'ask',
    why: 'To instrukcje sterujące agentem. Agent, który sam je zmienia, może po cichu poluzować własne zasady.',
    fix: 'Uzasadnij zmianę w jednym zdaniu. Człowiek zatwierdzi ją ręcznie.' },
  { globs: ['package-lock.json', '**/package-lock.json'], decision: 'deny',
    why: 'Lockfile edytowany ręcznie rozjeżdża się z rzeczywistym drzewem zależności.',
    fix: 'Zmieniaj zależności tylko komendami npm (install/uninstall/update) — lockfile zaktualizuje się sam.' },
  { globs: ['.github/workflows/**', '.github/CODEOWNERS', 'LICENSE', '.gitleaks.toml'], decision: 'ask',
    why: 'Zmiany w CI, licencji i konfiguracji skanera sekretów wpływają na bezpieczeństwo całego projektu.',
    fix: 'Uzasadnij zmianę w jednym zdaniu — człowiek zatwierdzi ją ręcznie.' },
  { globs: ['tests/**/__snapshots__/**', 'tests/**/*.snap'], decision: 'ask',
    why: 'Aktualizacja snapshotów to klasyczny sposób na „zazielenienie” testu bez naprawy kodu.',
    fix: 'Najpierw wyjaśnij, DLACZEGO oczekiwany wynik się zmienił (zmiana wymagań?). Jeśli to regresja — napraw kod, nie snapshot.' },
];

// --- 3. Wzorce sekretów (spójne z regułą produktu no-secrets, patrz docs/04-katalog-regul.md) ---
const SECRET_PATTERNS = [
  ['AWS access key', /\b(AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Anthropic API key', /\bsk-ant-[a-zA-Z0-9_-]{20,}/],
  ['OpenAI API key', /\bsk-(proj-)?[a-zA-Z0-9_-]{32,}/],
  ['Stripe live key', /\b(sk|rk)_live_[0-9a-zA-Z]{20,}/],
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{60,}/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  ['npm token', /\bnpm_[A-Za-z0-9]{36}\b/],
  ['Klucz prywatny', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['URL bazy z hasłem', /\b(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp):\/\/[^\s:/@]+:[^\s@/]{3,}@/],
];
// Fałszywe sekrety są dozwolone TYLKO w fixture'ach i muszą mieć marker w tej samej linii (patrz .claude/rules/testy.md).
// Bez "TEST": słowa test/latest/contest są w fixture'ach wszędzie i przepuszczałyby prawdziwe sekrety.
const SECRET_ALLOWED_GLOBS = ['tests/fixtures/**'];
const FAKE_MARKER = /FAKE|EXAMPLE|DUMMY|XXXX/i;

/** Linia treści, w której leży dopasowanie (marker musi być w tej samej linii co sekret). */
function lineAround(text, index, length) {
  const start = text.lastIndexOf('\n', index) + 1;
  const end = text.indexOf('\n', index + length);
  return text.slice(start, end === -1 ? undefined : end);
}

function newContentOf(input) {
  const ti = input.tool_input ?? {};
  if (typeof ti.content === 'string') return ti.content; // Write
  if (typeof ti.new_string === 'string') return ti.new_string; // Edit
  if (Array.isArray(ti.edits)) return ti.edits.map((e) => e?.new_string ?? '').join('\n'); // MultiEdit
  if (typeof ti.new_source === 'string') return ti.new_source; // NotebookEdit
  return '';
}

try {
  const input = readHookInput();
  const ti = input.tool_input ?? {};
  const rawPath = ti.file_path ?? ti.notebook_path ?? '';
  if (!rawPath) process.exit(0);
  const rel = toRelative(rawPath);

  // Zapis poza projektem
  if (rel.startsWith('..') || path.isAbsolute(rel)) {
    denyPreToolUse(formatViolation({
      id: 'edit/outside-project', file: rawPath,
      why: 'Agent pracuje wyłącznie w katalogu projektu.',
      fix: `Zapisuj pliki tylko wewnątrz ${PROJECT_DIR}.`,
    }));
  }

  for (const rule of FORBIDDEN) {
    if (matchesAny(rel, rule.globs) && !matchesAny(rel, rule.except ?? [])) {
      denyPreToolUse(formatViolation({ id: 'edit/forbidden-file', file: rel, why: rule.why, fix: rule.fix }));
    }
  }

  for (const rule of PROTECTED) {
    if (matchesAny(rel, rule.globs)) {
      const msg = formatViolation({ id: 'edit/protected-file', file: rel, why: rule.why, fix: rule.fix });
      if (rule.decision === 'ask') askPreToolUse(msg);
      denyPreToolUse(msg);
    }
  }

  // Zaakceptowane ADR są niezmienne — zmiana decyzji = nowy ADR, który zastępuje stary.
  if (matchesAny(rel, ['docs/adr/*.md']) && !rel.endsWith('0000-szablon.md')) {
    const current = readTextSafe(path.join(PROJECT_DIR, rel));
    if (current && /^\*\*Status:\*\*\s*Zaakceptowany/m.test(current)) {
      denyPreToolUse(formatViolation({
        id: 'edit/accepted-adr', file: rel,
        why: 'Zaakceptowany ADR to zapis historyczny decyzji. Jego edycja zaciera, dlaczego coś zrobiono.',
        fix: 'Utwórz nowy ADR skillem /adr ze statusem „Proponowany” i polem „Zastępuje: ADR-XXXX”. W starym człowiek zmieni status na „Zastąpiony”.',
      }));
    }
  }

  // Sekrety w treści
  const content = newContentOf(input);
  if (content) {
    const inFixtures = matchesAny(rel, SECRET_ALLOWED_GLOBS);
    for (const [name, re] of SECRET_PATTERNS) {
      const m = content.match(re);
      if (!m) continue;
      if (inFixtures && FAKE_MARKER.test(lineAround(content, m.index, m[0].length))) continue;
      denyPreToolUse(formatViolation({
        id: 'edit/secret-in-content', file: rel,
        why: `Zapisywana treść wygląda na sekret (${name}). Sekret w repo = wyciek, nawet po późniejszym usunięciu (zostaje w historii gita).`,
        fix: inFixtures
          ? 'W fixture używaj WYŁĄCZNIE fałszywych wartości z markerem FAKE/EXAMPLE w wartości lub komentarzu obok, np. `sk-ant-FAKE0000000000000000000000`.'
          : 'Czytaj wartość z konfiguracji/zmiennej środowiskowej (process.env.X), a w testach użyj fixture z tests/fixtures/ z markerem FAKE.',
      }));
    }
  }

  // Zmiana zakresu aktywnego zadania wymaga zgody człowieka (agent nie może sam poszerzyć sobie scope).
  const task = readCurrentTask();
  if (rel === '.claude/state/task.json' && task) {
    let next = null;
    try {
      if (typeof ti.content === 'string') next = JSON.parse(ti.content);
      else if (typeof ti.new_string === 'string') {
        const cur = readTextSafe(path.join(PROJECT_DIR, rel)) ?? '';
        next = JSON.parse(ti.replace_all ? cur.split(ti.old_string).join(ti.new_string) : cur.replace(ti.old_string, ti.new_string));
      }
    } catch { next = null; }
    const sameScope = next && JSON.stringify([...(next.scope ?? [])].sort()) === JSON.stringify([...(task.scope ?? [])].sort());
    const sameTask = next && next.id === task.id;
    if (!(sameScope && sameTask)) {
      askPreToolUse(formatViolation({
        id: 'edit/task-scope-change', file: rel,
        why: 'Zmiana zakresu lub podmiana aktywnego zadania. To decyzja człowieka, nie agenta.',
        fix: 'Człowiek: zatwierdź tylko jeśli zgadzasz się na nowy zakres. Agent: w odpowiedzi wypisz stary i nowy zakres oraz powód.',
      }));
    }
    process.exit(0);
  }

  // Bez aktywnego zadania i na gałęzi głównej nie ma zmian w repo (CLAUDE.md: „Bez aktywnego zadania nie ma zmian w kodzie”, „Nigdy praca na main”).
  if (!matchesAny(rel, STATE_GLOBS)) {
    if (!task) {
      denyPreToolUse(formatViolation({
        id: 'edit/no-active-task', file: rel,
        why: 'Brak aktywnego zadania (.claude/state/task.json albo status "done"). Bez zadania nie ma gałęzi, zakresu ani kryteriów akceptacji.',
        fix: 'Uruchom /start-zadania (gałąź, zakres, plan), a dopiero potem wprowadzaj zmiany. Jeśli człowiek prosi o drobną poprawkę poza zadaniem, powiedz mu, że wymaga to zadania.',
      }));
    }
    const branch = currentBranch();
    if (PROTECTED_BRANCHES.includes(branch)) {
      denyPreToolUse(formatViolation({
        id: 'edit/on-protected-branch', file: rel,
        why: `Jesteś na gałęzi "${branch}". Zmiany powstają na gałęzi zadania i trafiają na main przez PR.`,
        fix: `Przełącz się na gałąź zadania${task.branch ? ` (\`git switch ${task.branch}\`)` : ''} albo utwórz ją przez /start-zadania.`,
      }));
    }
  }

  // Scope guard — tylko gdy zadanie jest aktywne
  if (task && Array.isArray(task.scope) && task.scope.length > 0) {
    const alwaysAllowed = ['.claude/state/**', 'docs/**', '.changeset/**'];
    if (!matchesAny(rel, [...task.scope, ...alwaysAllowed])) {
      denyPreToolUse(formatViolation({
        id: 'edit/out-of-scope', file: rel,
        why: `Plik jest poza zakresem zadania "${task.id ?? '?'}: ${task.goal ?? ''}". Zmiany spoza zakresu rozmywają PR i często psują rzeczy, o które nikt nie prosił.`,
        fix: `Zakres: ${task.scope.join(', ')}. Jeśli ta zmiana jest NIEZBĘDNA do zadania, zatrzymaj się i zapytaj człowieka o rozszerzenie zakresu (on zaktualizuje .claude/state/task.json). Jeśli to „przy okazji” — zapisz pomysł w .claude/state/followups.md i wróć do zadania.`,
      }));
    }
  }

  process.exit(0);
} catch (err) {
  failOpen('pre-edit-guard', err);
}
