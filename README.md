# Schrankplaner

Planer für einen U-förmigen Einbauschrank mit selbstgebauten Multiplex-Korpussen im IKEA-PAX-Raster.
Türen, Scharniere und KOMPLEMENT-Inneneinrichtung werden bei IKEA gekauft.

**Online:** https://flori0815.github.io/Schrankplaner/

## Funktionen
- Raum parametrisch: Raumhöhe, Flanke links, Hauptwand, Flanke rechts
- Höhenaufbau: PAX 236 (Tür 229) mit Sockelrahmen und Zierleiste bis zur Decke (Standard) oder PAX 201 mit Aufsatzkorpus
- Korpus: Seiten, Boden und Deckel aus Multiplex, Rückwand in Nut, Sockelrahmen statt Füßen
- Zeilen je Wand mit PAX-Korpussen 50/75/100, Sonderbreiten und Passblenden; „Auto“ füllt eine Zeile auf
- Ecken: L-Eck (wie PAX-Eckanbauelement), Blindeck (Hauptwand oder Flanke läuft durch) oder Stoß
- Inneneinrichtung im 32-mm-Lochraster mit KOMPLEMENT-Teilen (Artikelnummern aus der Kaufhilfe 10/2026) und Vorlagen
- Klappbett 160×200 in Multiplex mit gekauftem Lattenrost (2×80 oder 1×160): Bettrahmen, Prüfung von Einklapptiefe und Höhe, Gewicht für die Wahl der Gasdruckfedern, Durchgang vor dem ausgeklappten Bett
- Ansichten: abgewickelte Fronten (mit Türen / Innenansicht), Draufsicht mit Türschwenkbereichen, 3D mit Türen und Bett auf/zu
- Bohrplan je Seitenwand mit Lochreihen, Scharnier-Montageplatten und Nut
- Zuschnittliste, Einkaufsliste und Bohrplan als CSV
- Speichern/Laden als JSON, automatische Speicherung im Browser

## Wichtig
Die PAX-Innenbreiten, die Lochreihen und die Scharnierpositionen sind Startwerte. Vor dem Bohren an einem
Original-KOMPLEMENT-Teil und an den vorgebohrten Türen nachmessen und unter „PAX-Maße & Lochraster“ anpassen.

Die alte Version liegt unter `legacy/`.

## Lokal starten
Ein beliebiger statischer Webserver im Repo-Ordner, z. B. `python3 -m http.server`, dann http://localhost:8000 öffnen.
