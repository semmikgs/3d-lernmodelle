# 3D-Lernmodelle

AR-Anschauungsmodelle (Technik, Physik, Mathematik) auf einem selbst gebastelten Markerwürfel – im iPad-Browser, ohne App.

**Start:** https://semmikgs.github.io/3d-lernmodelle/

1. Würfel aus `marker/wuerfel-vorlage.pdf` drucken (100 %), falten, kleben.
2. Modell über die Startseite oder per QR-Code öffnen, Kamera erlauben.
3. Würfel vor die Kamera halten.

Neues Modell: `.glb` in `modelle/` ablegen und in `modelle/liste.js` eintragen – mit Einordnung `fach`, `jahrgang`, `thema`, `schulform`, `schlagworte`, `kurz`. Die Startseite (Übersicht mit Filtern, QR-Codes) aktualisiert sich daraus automatisch (optional mit Untermenü `teile` – die IDs sind Gruppennamen im Modell).

Direktlink auf einen Raum: `viewer.html?m=villa&r=atrium`

Die Modelle werden per Skript erzeugt (`quellen/`, benötigt Node + `npm i three`, für die Pflanzenzelle zusätzlich `npm i --legacy-peer-deps three@0.160 three-bvh-csg three-mesh-bvh @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions`): `node quellen/villa.mjs modelle`

Technik: three.js + AR.js (ARToolKit, 3×3-Barcode-Marker 1–6).

## Ansicht und Erkennung
- **Ansicht**-Knopf: Kamera → Neutral → Themenbild (Hand und Würfel ausgeblendet, Modell bleibt bei Aussetzern stehen). Themenbild pro Modell über `thema` in `modelle/liste.js`, Bilder in `hintergruende/`.
- Erkennung: alle sichtbaren Würfelseiten werden per Mehrheitsentscheid fusioniert und geglättet (`js/tracker.js`); kurze Aussetzer überbrückt der Lagesensor des iPads (einmal „Tippen zum Starten“).
- Kameradaten werden passend zum Seitenverhältnis des Kamerabilds erzeugt (Bildwinkel Standard 60°, änderbar mit `fov=`), ein Rest-Unterschied wird aus mehreren sichtbaren Würfelseiten selbst korrigiert.
- URL-Parameter: `ansicht=neutral|thema`, `fov=60`, `aufl=niedrig` (schnellere Auswertung für ältere Geräte), `schwelle=otsu`, `gyro=0`, `debug=1`.

## Tafelansicht
`tafel.html` – Bastelwürfel bzw. Modell zum Drehen am ActiveBoard (Finger/Maus, Pinch/Mausrad), Schnellknöpfe für Standardansichten. Zoom bis tief ins Modell; Verschieben mit den Pfeilknöpfen (gedrückt halten), Pfeiltasten, zwei Fingern oder rechter Maustaste – gedreht wird immer um den Punkt in der Bildmitte, „Mitte“ setzt zurück. Direkt mit Modell: `tafel.html?m=villa`.

## Animationen
Modelle können glTF-Animationsclips enthalten (z. B. `plattentektonik.glb`). In `modelle/liste.js` bekommt ein Teil `animation: '<Clipname>'`; Viewer und Tafel zeigen dann Abspielen/Pause und einen Zeitregler (`js/animation.js`). `ganz: false` blendet „Ganzes Modell“ aus.

## Startseite
`index.html`: Übersicht mit Suche und Filtern (Fach, Jahrgang, Schulform, Thema), QR-Codes (Hover vergrößert, Klick = Vollbild für die Tafel), Reiter Info, Würfel basteln, Tafel. Vorgefilterte Links: `?fach=Biologie`, `?jahrgang=6`. Verlinkt aus KGS-Digital.

## Generatoren
Modelle, die direkt im Browser erzeugt werden – keine `.glb`-Datei, keine fremden Modelle (`js/generatoren/`). Eintrag in `modelle/liste.js` mit `generator: '<name>'`.

**Atomgenerator** (`?m=atom`): alle 118 Elemente, Auswahl über ein Periodensystem.
- Darstellungen: Kern-Hülle-Modell, Schalenmodell (Kugelschalen), Bohr’sches Atommodell (Kreisbahnen), Orbitalmodell (Unterschalen einzeln, Besetzung nach Hundscher Regel).
- Isotope (Neutronen ±, Stabilität für Elemente 1–20 und Uran) und Ionen (Ladung ±).
- Infotext mit Protonen/Neutronen/Elektronen, Schalenbesetzung, Außenelektronen, Elektronenkonfiguration (inkl. bekannter Ausnahmen wie Cr, Cu).
- Direktlinks: `viewer.html?m=atom&z=11&a=23&q=1&d=bohr` (z = Ordnungszahl, a = Massenzahl, q = Ladung, d = kernhuelle|schalen|bohr|orbital, u = Unterschale z. B. 3d).

**DNA** (`?m=dna`): maßstäbliche B-DNA – Doppelhelix (Furchen, 2 nm, 3,4 nm/Windung), Strickleiter, animierte Replikation; eigene Basenfolge (`&s=ATGC…`, `&d=helix|leiter|replikation`).

**Auge** (`?m=auge`): waagerechter Schnitt in mm, Lichtstrahlen nach dem Brechungsgesetz, Akkommodation animiert, Kurz-/Weitsichtigkeit mit berechneter Brille (`&b=fern|nah|nahStarr&a=normal|kurz|weit&br=1`).

**Jahreszeiten** (`?m=erdbahn`): geneigte Erde auf ihrer Bahn bzw. im Sonnenlicht, Tageslänge und Sonnenhöhe für Schwarmstedt (`&d=bahn|nah&t=jahr|alle|m03|m06|m09|m12`). Erdkarte `hintergruende/erde.jpg` aus Natural Earth (gemeinfrei).

**Körper** (`?m=koerper`): 8 Körper mit Maßen und Formeln, Netze animiert, Volumenvergleiche (`&k=quader&v=koerper|netz|volumen&a=4&b=3&c=2`).

**Elektromotor** (`?m=motor`): Leiterschleife im Magnetfeld, Drehung aus dem Drehmoment berechnet, mit/ohne Kommutator (`&b=kommutator|schleifring&u=1…5`).
