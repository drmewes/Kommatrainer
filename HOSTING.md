# Kommatrainer online stellen

Die App läuft kostenlos bei Cloudflare unter einer eigenen Adresse, zum Beispiel `https://kommatrainer.<dein-name>.workers.dev`. Hineinkommen nur E-Mail-Adressen, die du freischaltest. Wer sich anmeldet, bekommt einen Einmal-Code per Mail; Passwörter gibt es nicht. Jede Familie hat ihren eigenen Lernstand, und den Elternbereich schützt eine PIN, die jede Familie bei der ersten Anmeldung selbst festlegt.

Laut Cloudflare reicht der Gratis-Tarif locker: 100.000 Aufrufe pro Tag für die App und bis zu 50 Personen beim Login (Stand Oktober 2026). Für jedes Kind wird ein Eltern-Login benötigt. Die Einrichtung ist dieselbe wie bei Words with Pukeki, Schreiben mit Fritzi und dem LRS-Trainer; alle Apps können im selben Cloudflare-Konto und im selben Zero-Trust-Team laufen, jede mit eigener Datenbank (`kommatrainer`) und eigener Access-Anwendung. Lottas Lernstand bei Pukeki und hier bleibt getrennt.

## Einmalige Einrichtung (etwa 30 Minuten)

Alle Befehle laufen im Ordner `Satzland` mit Node 22:

```sh
cd Satzland
export PATH="$HOME/.local/share/pukeki-node/bin:$PATH"
```

### 1. Cloudflare-Konto und Datenbank

1. Kostenloses Konto anlegen: <https://dash.cloudflare.com/sign-up>
2. Im Terminal anmelden und die Datenbank anlegen:

   ```sh
   npx wrangler login
   npx wrangler d1 create kommatrainer
   ```

3. Die Vorlage kopieren und die ausgegebene `database_id` eintragen:

   ```sh
   cp .env.cloudflare.example .env.cloudflare
   ```

   In `.env.cloudflare` die Zeile `SCHREIBI_D1_DATABASE_ID=` ausfüllen. Die Datei bleibt auf deinem Rechner und landet nicht in Git.

### 2. Erster Upload

```sh
npm run deploy
```

Der Befehl baut die App, legt die Tabelle in der Datenbank an und lädt alles hoch. Am Ende steht die Adresse `https://kommatrainer.….workers.dev` im Terminal. Die Seite zeigt vorerst nur „Bitte melde dich an“, denn ohne Cloudflare Access lässt sie niemanden hinein.

### 3. Anmeldung mit Cloudflare Access

1. Im Dashboard **Zero Trust** öffnen und die Einrichtung abschließen: Team-Namen wählen und den Free-Tarif nehmen. Der Team-Name ergibt die Team-Domain `<team-name>.cloudflareaccess.com`. Ist Zero Trust für Pukeki oder Fritzi schon eingerichtet, gilt dieselbe Team-Domain.
2. Unter **Workers & Pages** → `kommatrainer` → Reiter **Access** → **Protect this Worker behind Access** → **All traffic** wählen. Dabei die Option **Cloudflare account** wählen, dann kommst vorerst nur du selbst hinein. Session-Dauer auf **1 Monat** stellen, damit die Kinder nicht ständig neu angemeldet werden müssen. Zum Schluss **Apply Access**.
3. In **Zero Trust** → **Access controls** → **Applications** die neue App öffnen (**Configure**):
   - Unter **Additional settings** den **Application Audience (AUD) Tag** kopieren.
   - Unter den Policies eine Regel **Include → Emails** anlegen. Dort trägst du später die Eltern ein; deine eigene Adresse gehört gleich mit hinein.
4. Unter den Anmeldemethoden (**Login methods**) prüfen, dass **One-time PIN** aktiv ist.
5. In `.env.cloudflare` eintragen:

   ```
   ACCESS_TEAM_DOMAIN=<team-name>.cloudflareaccess.com
   ACCESS_AUD=<der kopierte AUD-Tag>
   ```

6. Noch einmal hochladen:

   ```sh
   npm run deploy
   ```

7. Testen: Die Adresse in einem privaten Browserfenster öffnen, die eigene E-Mail eingeben, den Code aus der Mail eingeben. Danach erscheint die Einrichtung mit dem Namen des Kindes und der Eltern-PIN.

## Eltern einladen

1. In **Zero Trust** → **Access controls** → **Applications** → App → Policy → **Emails** die Adresse ergänzen.
2. Den Link und den folgenden Text verschicken.

> **Kommatrainer – Kommasetzung im Königreich Satzland**
>
> 1. Diesen Link öffnen: https://kommatrainer.….workers.dev
> 2. Die E-Mail-Adresse eingeben, an die diese Nachricht ging. Gleich darauf kommt ein Code per Mail, den gibst du ein.
> 3. Beim ersten Mal fragt die App nach dem Namen des Kindes (Vorname oder Spitzname reicht) und nach einer Eltern-PIN mit 4–6 Ziffern. Die PIN schützt den Elternbereich mit Lernstand, Wortlisten und Einstellungen.
> 4. Als App aufs Handy:
>    - **iPhone:** in Safari auf Teilen ⬆️ → „Zum Home-Bildschirm“.
>    - **Android:** in Chrome auf ⋮ → „App installieren“ oder „Zum Startbildschirm hinzufügen“.
> 5. PIN vergessen? Kurz bei mir melden.
>
> Die App speichert nur den Vornamen oder Spitznamen, die Übungsergebnisse und die E-Mail-Adresse für die Anmeldung. Es gibt keine Werbung und keine Kosten.

Die **Master-PIN** öffnet jeden Elternbereich und erlaubt danach eine neue PIN. Gib sie nur weiter, wenn jemand die eigene PIN vergessen hat.

## Updates

Nach Änderungen am Code einfach wieder:

```sh
npm run deploy
```

Lernstände und PINs bleiben erhalten.

## Gut zu wissen

- Alle Daten liegen in **deiner** Cloudflare-Datenbank. Technisch kannst du damit auch die Lernstände der anderen Familien sehen. Sag das den Eltern ruhig offen.
- **Mehrere Geräte:** Wer sich mit derselben E-Mail anmeldet, sieht denselben Lernstand. Geschwister brauchen deshalb je eine eigene E-Mail-Adresse.
- **Abmelden** steht im Elternbereich unter Einstellungen. Das braucht man nur auf geliehenen oder geteilten Geräten.
- **Offline** kann weiter geübt werden, solange die App geöffnet ist. Die Antworten werden später übertragen. Neue Tagesportionen und der Elternbereich brauchen eine Verbindung.
- **Vorlesen:** Schreibi spricht mit den Stimmen des Geräts. Auf Tablets und in Microsoft Edge klingen die deutschen Stimmen am natürlichsten; im Elternbereich lässt sich eine Stimme auswählen.
- **Lokal testen** geht weiterhin mit `./start.sh`, und zwar mit dem Test-Login und der lokalen Datenbank, nicht mit den Online-Daten.
