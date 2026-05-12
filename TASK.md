# Task: auth.ts Barrel-File entfernen

## Ziel
Die Datei src/lib/admin/auth.ts (Re-Export-Barrel) entfernen, da sie von keinem
Modul mehr importiert wird. PROJECT_AUDIT.md, Abschnitt 3, "Auth-Pattern".

## Akzeptanzkriterien
- src/lib/admin/auth.ts ist gelöscht
- npm run build läuft fehlerfrei durch
- npm run test läuft fehlerfrei durch
- npm run typecheck läuft fehlerfrei
- Keine Imports aus '@/lib/admin/auth' irgendwo im Projekt
- Commit mit Message: "refactor: remove unused auth.ts barrel"

## Aus dem Scope ausgenommen
- KEINE Änderungen an auth-edge.ts oder auth-node.ts
- KEINE neuen Tests
- KEIN Anfassen anderer Dead-Code-Kandidaten
