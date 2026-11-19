# Polityka bezpieczeństwa

CodeRail działa lokalnie, w repozytoriach użytkowników, przy każdym kroku agenta AI. Traktujemy błędy bezpieczeństwa narzędzia (wstrzyknięcie komend, path traversal, ReDoS, wyciek sekretów w wyjściu, obejście blokady przez celowy crash) jako krytyczne.

## Zgłaszanie
Nie otwieraj publicznego issue. Użyj **GitHub → Security → Report a vulnerability** (private vulnerability reporting) albo napisz na adres z profilu maintainera. Odpowiedź w ciągu 7 dni.

## Wspierane wersje
Do wydania 1.0 wspierana jest tylko najnowsza wersja 0.x.

## Model zagrożeń (skrót)
- Wejście z Claude Code (treść plików, komendy, ścieżki) jest niezaufane: model mógł zostać zmanipulowany treścią czytanych plików.
- Narzędzie nie wykonuje kodu użytkownika poza jawnym plikiem configu, nie łączy się z siecią, uruchamia wyłącznie `git` bez powłoki.
- Bypassy możliwe z założenia (poza modelem zagrożeń): człowiek z dostępem do terminala, który świadomie wyłącza hooki.
Szczegóły: `docs/02-architektura.md` (sekcja Bezpieczeństwo) i `.claude/rules/bezpieczenstwo-narzedzia.md`.
