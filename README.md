# Kommatrainer · Königreich Satzland

Kommasetzung für Klasse 5 und 6 nach der Methode „Könige und Königreiche“: Das Verb ist der König, zu jedem König gehört ein Königreich, und wo zwei Königreiche aneinanderstoßen, steht ein goldener Grenzposten – das Komma. Kleckser, der Tintenklecks, hat die Grenzposten gestohlen; mit Schreibi und der Prinzessin befreit das Kind Gebiet für Gebiet (Kernlehrplan NRW: Aufzählungen, Haupt- und Nebensätze, Torwörter, gemischte Texte).

Die App ist aus dem [LRS-Trainer](../LRS-Trainer/README.md) hervorgegangen und läuft technisch genauso: Next/vinext auf Cloudflare Workers, Lernstand in D1, Anmeldung über Cloudflare Access, Elternbereich mit PIN. Inhalte und Plan: [PLAN-KOMMA.md](PLAN-KOMMA.md). Der App-Name steht in `Satzland/app/lib/engine.mjs` (`APP_NAME`, `MASCOT`), in `layout.tsx` und `public/manifest.webmanifest`; die Gebiete und Sätze in `Satzland/app/data/satzland.mjs`.

## Lokal starten

`./start.sh` (Linux/Mac) oder `start.cmd` (Windows). Die App läuft unter http://127.0.0.1:5176 mit Test-Login und lokaler Datenbank.

Den bisherigen Satzland-Fortschritt aus dem lokalen LRS-Trainer übernimmt einmalig (bei gestoppten Servern):

```sh
cd Satzland && node scripts/lernstand-aus-lrs.mjs
```

Online stellen: [HOSTING.md](HOSTING.md).
