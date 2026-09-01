---
name: wohnungen-toggle
description: Blendet die Wohnungen-Sektion der Website ein oder aus (Übersichtsseite, alle Detailseiten, Menüpunkt).
disable-model-invocation: true
allowed-tools: Read, Edit, Bash, Glob, AskUserQuestion
argument-hint: [ein|aus]
---

# Wohnungen ein-/ausblenden

Schaltet die komplette Wohnungen-Sektion der DERKO-Website an oder aus.

Im Zustand **aus** liefern alle Wohnungs-URLs ein echtes HTTP-404 (Übersicht, alle
Detailseiten, alle Sprachvarianten, auch Legacy-Links mit `?id=`), und der Menüpunkt
"Wohnungen" verschwindet aus der Navigation. Das funktioniert, weil Apache über die
bereits vorhandene `.htaccess`-Direktive `ErrorDocument 404 /pages/404.html`
automatisch die 404-Seite ausliefert, sobald das Rewrite-Ziel nicht existiert.

Links, die weiterhin auf Wohnungen zeigen (Startseiten-Button, Feature-Karten,
FAQ-Links, Kontaktformular-Dropdown), führen dann bewusst auf die 404-Seite — das ist
so gewollt und erfordert keine weiteren Änderungen.

**Wichtig:** Es werden ausschließlich diese drei Dinge verändert:
zwei HTML-Dateien werden umbenannt (Inhalt bleibt unangetastet) und in
`components/header.html` wird ein Navigationsblock aus-/einkommentiert.
`.htaccess`, `router.php`, `api/*`, `lang/*` und alle JS-Dateien werden **nie** angefasst.

## Die beiden Zustände

| | Zustand EIN | Zustand AUS |
|---|---|---|
| Übersichtsseite | `pages/wohnungen.html` | `pages/wohnungen_x.html` |
| Detailseite | `pages/wohnung-detail.html` | `pages/wohnung-detail_x.html` |
| Menüpunkt | aktiv | auskommentiert |

## Ablauf

### 1. Aktuellen Zustand ermitteln

```bash
ls pages/wohnungen.html pages/wohnungen_x.html pages/wohnung-detail.html pages/wohnung-detail_x.html 2>&1
```

und prüfen, ob der Marker im Header vorhanden ist:

```bash
grep -c "WOHNUNGEN-TOGGLE:OFF-START" components/header.html
```

Daraus den Zustand ableiten:
- **EIN**: `wohnungen.html` + `wohnung-detail.html` existieren, kein Marker im Header.
- **AUS**: `wohnungen_x.html` + `wohnung-detail_x.html` existieren, Marker im Header vorhanden.
- **Mischzustand**: alles andere (z.B. Dateien umbenannt, Menüpunkt aber noch sichtbar).
  Das ist kein Fehler — es wird gemeldet und beim Anwenden vollständig korrigiert.

Zusätzlich prüfen, ob im Arbeitsverzeichnis noch andere ungesicherte Änderungen liegen:

```bash
git status --short
```

Falls ja: den Nutzer darauf hinweisen, aber nicht blockieren.

### 2. Zustand melden und fragen

Den aktuellen Zustand auf Deutsch melden, z.B.:
„Wohnungen sind aktuell **sichtbar**."

Dann mit `AskUserQuestion` fragen: **„Wohnungen anzeigen?"** mit den Optionen
**„Ja — Wohnungen anzeigen"** und **„Nein — Wohnungen ausblenden"**.

Wurde der Skill mit einem Argument aufgerufen (`ein`/`an`/`ja` bzw. `aus`/`nein`),
die Frage überspringen und direkt den gewünschten Zustand herstellen.

Entspricht der gewünschte Zustand bereits dem aktuellen (und liegt kein Mischzustand
vor), nichts ändern und das kurz melden.

### 3. Zielzustand herstellen

#### Nach AUS schalten

Dateien umbenennen — vorher jeweils prüfen, dass die Quelle existiert und das Ziel
noch **nicht** existiert:

```bash
git mv pages/wohnungen.html pages/wohnungen_x.html
git mv pages/wohnung-detail.html pages/wohnung-detail_x.html
```

Schlägt `git mv` fehl (z.B. Datei nicht in Git erfasst), auf `mv` zurückfallen.

Danach `components/header.html` lesen und den Navigationsblock für Wohnungen mit
`Edit` durch die auskommentierte Fassung ersetzen. Alter Text:

```html
        <li class="nav-item">
          <a class="nav-link" id="nav-wohnungen" href="wohnungen.html"
            data-i18n="navigation.wohnungen"></a
          >
        </li>
```

Neuer Text:

```html
        <!-- WOHNUNGEN-TOGGLE:OFF-START
        <li class="nav-item">
          <a class="nav-link" id="nav-wohnungen" href="wohnungen.html"
            data-i18n="navigation.wohnungen"></a
          >
        </li>
        WOHNUNGEN-TOGGLE:OFF-END -->
```

Die beiden Marker sind entscheidend: Sie machen den Weg zurück eindeutig auffindbar.

#### Nach EIN schalten

Exakt die Umkehrung — Dateien zurückbenennen:

```bash
git mv pages/wohnungen_x.html pages/wohnungen.html
git mv pages/wohnung-detail_x.html pages/wohnung-detail.html
```

Danach in `components/header.html` per `Edit` die auskommentierte Fassung wieder
durch den ursprünglichen Block ersetzen (also die beiden Markerzeilen entfernen).
Der `<li>`-Block selbst bleibt dabei unverändert.

### 3b. Änderung verifizieren (nicht überspringen)

`components/header.html` verwendet **CRLF**-Zeilenenden. Eine Ersetzung über mehrere
Zeilen kann dadurch fehlschlagen, ohne einen Fehler zu werfen — deshalb immer
gegenprüfen, ob der Edit tatsächlich gegriffen hat:

```bash
grep -c "WOHNUNGEN-TOGGLE:OFF-START" components/header.html
ls pages/wohnungen*.html pages/wohnung-detail*.html
```

Erwartung nach **AUS**: Marker-Zähler `1`, und es existieren nur die `_x`-Dateien.
Erwartung nach **EIN**: Marker-Zähler `0`, und es existieren nur die Dateien ohne `_x`.

Stimmt das nicht, die Ersetzung erneut versuchen — dabei den Block zeilenweise
adressieren statt als ein großer Mehrzeilen-String.

### 4. Ergebnis melden

Auf Deutsch kurz zusammenfassen, was geändert wurde, plus diese beiden Hinweise:

- **Harter Reload nötig** (Strg+F5 bzw. Strg+Shift+R): `components/header.html` wird
  vom Browser gecached — ohne harten Reload ist der Menüpunkt scheinbar noch da.
- **Kein Docker-Neustart nötig**: Das Projektverzeichnis ist in den Container gemountet,
  Änderungen wirken sofort.

Die Änderungen bleiben **uncommitted**. Für Commit/Push den bestehenden
`release-github`-Skill verwenden.

## Prüfen (optional)

Bei laufendem Docker (`npm run docker:up`) lässt sich der Zustand AUS so verifizieren:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/wohnungen
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/wohnung/w03-exklusiv
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8081/en/wohnungen
```

Erwartung im Zustand AUS: jeweils `404`. Im Zustand EIN: jeweils `200`.

Automatisierte Tests decken beide Zustände ab:

```bash
npm run test:toggle
```

## Hinweise

- Der Skill ist **idempotent** — mehrfaches Ausführen ist gefahrlos.
- Bekannte Einschränkung: Im lokalen PHP-Dev-Server (`npm run dev`) würde eine fehlende
  Datei einen PHP-Fehler statt einer sauberen 404-Seite erzeugen, weil `router.php`
  direkt `require`t. Über Docker/Apache (der übliche Weg hier) greift `ErrorDocument`
  korrekt. Bewusst nicht behandelt, um `router.php` nicht anzufassen.
- Bei längerer Abschaltung ggf. bedenken: `sitemap.xml` enthält 72 Wohnungs-URLs
  (7 Wohnungen × 9 Sprachen + Übersichtsseiten), die dann für Suchmaschinen ins Leere zeigen.
