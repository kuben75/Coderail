#!/usr/bin/env node
// SessionStart (startup|resume|clear|compact): wstrzykuje do kontekstu stan pracy.
// stdout z exit 0 trafia do kontekstu agenta jako zwykły tekst.
// Po kompaktowaniu (source=compact) dodatkowo przypomina twarde zasady, które mogły „wyparować”.

import path from 'node:path';
import { readHookInput, git, readCurrentTask, readTextSafe, failOpen, STATE_DIR } from './lib/common.mjs';

try {
  const input = readHookInput();
  const source = input.source ?? 'startup';
  const lines = [];

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']) || '(brak repo git)';
  lines.push(`## Stan repozytorium (hook SessionStart, źródło: ${source})`);
  lines.push(`- Gałąź: ${branch}`);
  if (['main', 'master'].includes(branch)) {
    lines.push('- UWAGA: jesteś na gałęzi głównej. Przed jakąkolwiek zmianą uruchom /start-zadania (utworzy gałąź i zakres).');
  }
  const status = git(['status', '--short']).split('\n').filter(Boolean);
  lines.push(`- Niezacommitowane pliki: ${status.length}${status.length ? `\n  ${status.slice(0, 15).join('\n  ')}${status.length > 15 ? '\n  …' : ''}` : ''}`);
  const log = git(['log', '--oneline', '-5']);
  if (log) lines.push(`- Ostatnie commity:\n  ${log.split('\n').join('\n  ')}`);

  const task = readCurrentTask();
  if (task) {
    lines.push('', '## Aktywne zadanie (.claude/state/task.json)');
    lines.push(`- ${task.id ?? '?'}: ${task.goal ?? ''}`);
    if (task.scope?.length) lines.push(`- Zakres (scope guard): ${task.scope.join(', ')}`);
    if (task.acceptance?.length) lines.push(`- Kryteria akceptacji:\n  - ${task.acceptance.join('\n  - ')}`);
    const plan = readTextSafe(path.join(STATE_DIR, 'plan.md'));
    if (plan) lines.push(`- Plan: .claude/state/plan.md (przeczytaj, zanim zaczniesz; odhaczaj kroki)`);
    const handoff = readTextSafe(path.join(STATE_DIR, 'handoff.md'));
    if (handoff) lines.push(`- Notatka przekazania z poprzedniej sesji: .claude/state/handoff.md (przeczytaj najpierw)`);
  } else {
    lines.push('', '- Brak aktywnego zadania. Jeśli użytkownik prosi o zmianę w kodzie, zacznij od /start-zadania.');
  }

  if (source === 'compact' || source === 'resume') {
    lines.push('', '## Przypomnienie twardych zasad (po kompaktowaniu kontekstu)');
    lines.push('- Test najpierw: każda zmiana zachowania reguły zaczyna się od fixture\'a, który teraz nie przechodzi.');
    lines.push('- Zależności tylko do środka: cli → adapters → core ← rules. core i rules bez fs/child_process/console.');
    lines.push('- Nie osłabiaj testów, nie dodawaj @ts-ignore/any/.skip. Hooki to wyłapią — nie obchodź ich.');
    lines.push('- Nie wychodź poza zakres zadania. Pomysły „przy okazji” → .claude/state/followups.md.');
    lines.push('- Przed „gotowe”: /weryfikacja. Commit tylko przez /commit, PR tylko przez /pr.');
  }

  process.stdout.write(lines.join('\n') + '\n');
  process.exit(0);
} catch (err) {
  failOpen('session-start', err);
}
