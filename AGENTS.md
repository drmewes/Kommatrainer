# Prüfungen und visuelle Kontrolle

Die App wird am Tablet oder PC genutzt, von einem Kind in Klasse 5 mit LRS. Schlanke Prüfungen genügen; keine ausgedehnten Screenshot- oder Layoutmatrizen.

- Für UI-Änderungen reichen drei repräsentative Ansichten: Tablet quer 1024 × 768, Desktop 1280 × 900 und Handy 390 × 844. Beim Schreiben müssen Tastatur und „Fertig“ ohne Scrollen sichtbar sein.
- Pro Format einen repräsentativen Screenshot aufnehmen und ansehen. Zusätzliche Ansichten nur für konkret beobachtete Fehler.
- Funktionale Tests auf die geänderte Funktion beschränken. `npm test` und `npm run typecheck` einmal ausführen; der Build steckt ohnehin in `npm run deploy`.
- Änderungen an Sätzen und Gebieten in `Satzland/app/data/satzland.mjs` mit `npm test` prüfen: Die Tests kontrollieren für jeden Satz Könige, Königreiche, Kommas und Erklärungen.
- Inhaltlich gilt: Kinder sehen keine falsch gesetzten Kommas als Vorbild; überflüssige Kommas erscheinen nur als durchgestrichene Fehler mit Erklärung.
- Der lokale Server läuft auf Port 5176, damit er neben Words with Pukeki (5173), Schreiben mit Fritzi (5174) und dem LRS-Trainer (5175) laufen kann.
