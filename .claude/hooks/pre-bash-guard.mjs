#!/usr/bin/env node
// PreToolUse(Bash): blokuje komendy niebezpieczne dla repo, historii gita i sekretów.
// Hook bezpieczeństwa — przy błędzie wewnętrznym fail-open, ale wzorce są proste i przetestowane
// (patrz .claude/hooks/README.md -> "Jak testować hooki").

import { readHookInput, git, denyPreToolUse, askPreToolUse, formatViolation, failOpen } from './lib/common.mjs';

const PROTECTED_BRANCHES = ['main', 'master'];

/**
 * Reguły: [id, regex, why, fix, decyzja]. Kolejność ma znaczenie — pierwsza pasująca wygrywa.
 * Regexy są zakotwiczone na granicach słów i nie mają zagnieżdżonych kwantyfikatorów (brak ReDoS).
 */
const RULES = [
  // --- omijanie kontroli ---
  ['no-verify', /\bgit\s+(commit|push|merge|rebase)\b[^;&|]*\s--no-verify\b|\bgit\s+commit\b[^;&|]*\s-[a-zA-Z]*n[a-zA-Z]*(\s|$)/,
    'Omijanie git hooków wyłącza całą kontrolę jakości (sekrety, testy, format commita).',
    'Usuń --no-verify / -n. Jeśli hook blokuje, napraw przyczynę (`npm run verify`) zamiast go omijać.', 'deny'],
  ['hooks-path', /\bgit\b[^;&|]*\bconfig\b[^;&|]*core\.hookspath/i,
    'Zmiana core.hooksPath odłącza git hooki projektu.',
    'Nie zmieniaj konfiguracji hooków. Jeśli hook jest błędny — opisz problem człowiekowi.', 'deny'],
  ['skip-env', /\b(HUSKY|SKIP_HOOKS|SKIP_SIMPLE_GIT_HOOKS|CODERAIL_DISABLE|LEFTHOOK)=/,
    'Zmienne środowiskowe wyłączające hooki omijają kontrolę.',
    'Uruchom komendę bez tej zmiennej i napraw zgłoszone problemy.', 'deny'],

  // --- historia gita ---
  ['force-push', /\bgit\s+push\b[^;&|]*\s(--force(?!-with-lease)|-f\b|\+\S+)/,
    'Force push nadpisuje historię zdalną i może zniszczyć cudzą (lub Twoją) pracę.',
    'Nie nadpisuj historii. Jeśli naprawdę trzeba, poproś człowieka — on wykona `--force-with-lease` ręcznie.', 'deny'],
  ['push-protected', new RegExp(`\\bgit\\s+push\\b[^;&|]*[\\s:+](${PROTECTED_BRANCHES.join('|')})(?=\\s|$|[;&|])`),
    'Bezpośredni push na gałąź główną omija PR, CI i review.',
    'Pracuj na gałęzi feature (`git switch -c feat/<nazwa>`), wypchnij ją i otwórz PR skillem /pr.', 'deny'],
  ['reset-hard', /\bgit\s+reset\b[^;&|]*--hard\b/,
    '`git reset --hard` nieodwracalnie usuwa niezacommitowane zmiany.',
    'Użyj `git stash` albo `git restore <plik>` dla konkretnego pliku. Przy wątpliwościach zapytaj człowieka.', 'deny'],
  ['clean-force', /\bgit\s+clean\b[^;&|]*\s-[a-z]*f/,
    '`git clean -f` usuwa nieśledzone pliki bez możliwości odzyskania.',
    'Usuń konkretne pliki wskazując je z nazwy albo zapytaj człowieka.', 'deny'],
  ['discard-all', /\bgit\s+(checkout|restore)\s+(--\s+)?\.(\s|$)/,
    'Odrzucenie wszystkich zmian naraz łatwo kasuje pracę, która nie dotyczy zadania.',
    'Przywracaj pojedyncze pliki: `git restore <ścieżka>`.', 'deny'],
  ['delete-protected-branch', new RegExp(`\\bgit\\s+branch\\b[^;&|]*\\s-[dD]\\b[^;&|]*\\s(${PROTECTED_BRANCHES.join('|')})(?=\\s|$|[;&|])`),
    'Usunięcie gałęzi głównej.', 'Nigdy nie usuwaj main/master.', 'deny'],
  ['history-rewrite', /\bgit\s+(filter-branch|filter-repo|replace)\b|\bgit\s+rebase\b[^;&|]*\s-i\b/,
    'Przepisywanie historii (i interaktywny rebase, który nie działa w tym środowisku).',
    'Zrób nowy commit poprawiający poprzedni. Squash nastąpi przy merge PR.', 'deny'],
  ['tag-release', /\bgit\s+tag\s+(?!-l\b|--list\b|-n\b)\S|\bgit\s+push\b[^;&|]*--(tags|follow-tags)\b/,
    'Tagi i wydania to decyzja człowieka (proces release przez changesets).',
    'Nie twórz tagów. Dodaj changeset (`npx changeset`) — wydanie zrobi człowiek.', 'deny'],

  // --- publikacja / zewnętrzne efekty ---
  ['publish', /\b(npm|pnpm|yarn)\s+publish\b|\bchangeset\s+publish\b/,
    'Publikacja paczki na npm jest nieodwracalna.',
    'Publikację wykonuje wyłącznie workflow release po decyzji człowieka.', 'deny'],
  ['gh-merge', /\bgh\s+(pr\s+merge|release\s+create|repo\s+(delete|edit))\b/,
    'Merge PR / release / zmiany repo na GitHubie to decyzja człowieka.',
    'Zostaw PR do review. Napisz w podsumowaniu, że jest gotowy do merge.', 'deny'],

  // --- system plików i sekrety ---
  ['rm-rf-root', /\brm\s+-[a-z]*r[a-z]*f?[a-z]*\s+(\/|~|\$HOME|\.\.?)(\/?\s|\/?$)/,
    'Rekurencyjne usuwanie katalogu głównego, domowego lub całego projektu.',
    'Usuń konkretne pliki/katalogi podając ich pełne ścieżki w projekcie.', 'deny'],
  ['read-secrets', /\b(cat|less|more|head|tail|grep|rg|sed|awk|bat|source|cp|base64|xxd|od)\b[^;&|]*?[\s/'"]\.env(?:\.(?!example\b)[\w.-]+)?(?=$|[\s'";&|])|\bprintenv\b|(^|[;&|]\s*)env\s*($|[|;&])/,
    'Odczyt plików .env / zmiennych środowiskowych może wypisać sekrety do kontekstu i logów.',
    'Nie czytaj sekretów. Strukturę zmiennych opisuje `.env.example`.', 'deny'],
  ['write-env', />\s*\.env(\.[\w.-]+)?(\s|$)/,
    'Nadpisywanie .env z poziomu agenta.', 'Poproś człowieka o uzupełnienie .env.', 'deny'],
  ['pipe-to-shell', /\b(curl|wget)\b[^|]*\|\s*(sudo\s+)?(ba|z)?sh\b/,
    'Uruchamianie skryptów z internetu bez weryfikacji.',
    'Pobierz plik, pokaż go człowiekowi i uruchom dopiero po akceptacji.', 'deny'],
  ['sudo', /(^|[;&|]\s*)sudo\b/,
    'Uprawnienia administratora nie są potrzebne w tym projekcie.', 'Wykonaj komendę bez sudo.', 'deny'],
  ['chmod-777', /\bchmod\s+(-R\s+)?0?777\b/,
    'Nadawanie pełnych uprawnień wszystkim.', 'Użyj minimalnych uprawnień (np. 755 dla skryptów).', 'deny'],

  // --- omijanie hooków edycji przez powłokę ---
  ['shell-write', /(>{1,2}|\btee\b(\s+-a)?)\s*['"]?(\.\/)?(src|tests|scripts|docs|\.claude|\.github|\.githooks)\/|\b(sed|perl)\s+(-[a-zA-Z]*i\b|--in-place)|\bcat\s*<<-?\s*['"]?\w+['"]?\s*>/,
    'Zapis plików przez powłokę (>, tee, sed -i, heredoc) omija hooki Edit/Write: scope guard, skan sekretów, anti-cheat i granice warstw.',
    'Użyj narzędzia Edit lub Write. Dzięki temu zmiana przejdzie przez te same kontrole co każda inna.', 'deny'],

  // --- zależności (dozwolone, ale świadomie) ---
  ['new-dependency', /\b(npm|pnpm|yarn)\s+(i|install|add)\b(?:\s+-\S+)*\s+[@a-z0-9]/,
    'Nowa zależność zwiększa czas startu CLI i powierzchnię ataku (supply chain).',
    'Sprawdź .claude/rules/dependencies.md. Uzasadnij potrzebę człowiekowi; preferuj wbudowane moduły Node.', 'ask'],
];

try {
  const input = readHookInput();
  const command = String(input?.tool_input?.command ?? '');
  if (!command) process.exit(0);

  for (const [id, regex, why, fix, decision] of RULES) {
    if (regex.test(command)) {
      const msg = formatViolation({ id: `bash/${id}`, why, fix });
      if (decision === 'ask') askPreToolUse(msg);
      denyPreToolUse(msg);
    }
  }

  // Commit / push bezpośrednio z gałęzi chronionej
  if (/\bgit\s+(commit|push)\b/.test(command)) {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
    if (PROTECTED_BRANCHES.includes(branch)) {
      denyPreToolUse(
        formatViolation({
          id: 'bash/on-protected-branch',
          why: `Jesteś na gałęzi "${branch}". Każda zmiana ma przejść przez gałąź feature i PR.`,
          fix: 'Utwórz gałąź: `git switch -c <typ>/<krótki-opis>` (np. feat/rule-no-secrets) i powtórz komendę.',
        }),
      );
    }
  }

  process.exit(0);
} catch (err) {
  failOpen('pre-bash-guard', err);
}
