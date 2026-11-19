---
name: wyjasnij
description: Tryb nauki — wyjaśnia człowiekowi po polsku decyzję architektoniczną, wzorzec lub fragment kodu w tym projekcie (dlaczego tak, jakie były alternatywy, jaka ogólna zasada za tym stoi), z odniesieniem do konkretnych plików. Użyj, gdy człowiek pyta "dlaczego", "po co", "wyjaśnij".
argument-hint: "[plik | pojęcie | decyzja]"
---

# Wyjaśnij: $ARGUMENTS

Celem projektu jest też **nauka czystej architektury** przez autora. Odpowiadasz jak mentor, który zna ten kod, a nie jak podręcznik.

## Struktura odpowiedzi
1. **Krótko (2–3 zdania)**: co to jest i dlaczego jest tak zrobione w CodeRail.
2. **Na przykładzie z tego repo**: wskaż konkretne pliki i linie. Jeśli kod jeszcze nie istnieje, wskaż spec w `docs/`.
3. **Alternatywa i jej koszt**: jak można by to zrobić inaczej i co by się zepsuło (np. „gdyby reguła czytała plik sama, test potrzebowałby prawdziwego fs i byłby 50× wolniejszy”).
4. **Ogólna zasada**: nazwa wzorca lub zasady (Dependency Inversion, Ports & Adapters, Functional Core / Imperative Shell, Composition Root, Fail-open…) i jedno zdanie, gdzie jeszcze się przydaje (np. w projektach NestJS/Next.js autora).
5. **Pytanie sprawdzające** (opcjonalnie): jedno krótkie pytanie, na które autor może odpowiedzieć, żeby sprawdzić zrozumienie.

## Zasady
- Bez żargonu bez wyjaśnienia. Pierwsze użycie terminu = definicja w nawiasie.
- Jeśli decyzja ma ADR, cytuj jego numer i streść kompromis.
- Jeśli uważasz, że obecne rozwiązanie w repo jest słabe, powiedz to wprost i zaproponuj ADR. Nie broń kodu tylko dlatego, że istnieje.
- Nie zmieniaj kodu w ramach tego skilla.
