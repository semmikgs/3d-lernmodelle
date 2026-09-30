# 3D-Lernmodelle

AR-Anschauungsmodelle (Technik, Physik, Mathematik) auf einem selbst gebastelten Markerwürfel – im iPad-Browser, ohne App.

**Start:** https://semmikgs.github.io/3d-lernmodelle/

1. Würfel aus `marker/wuerfel-vorlage.pdf` drucken (100 %), falten, kleben.
2. Modell über die Startseite oder per QR-Code öffnen, Kamera erlauben.
3. Würfel vor die Kamera halten.

Neues Modell: `.glb` in `modelle/` ablegen und in `modelle/liste.js` eintragen (optional mit Untermenü `teile` – die IDs sind Gruppennamen im Modell).

Direktlink auf einen Raum: `viewer.html?m=villa&r=atrium`

Die Modelle werden per Skript erzeugt (`quellen/`, benötigt Node + `npm i three`, für die Pflanzenzelle zusätzlich `npm i --legacy-peer-deps three-bvh-csg three-mesh-bvh`): `node quellen/villa.mjs modelle`

Technik: three.js + AR.js (ARToolKit, 3×3-Barcode-Marker 1–6).

## Ansicht und Erkennung
- **Ansicht**-Knopf: Kamera → Neutral → Themenbild (Hand und Würfel ausgeblendet, Modell bleibt bei Aussetzern stehen). Themenbild pro Modell über `thema` in `modelle/liste.js`, Bilder in `hintergruende/`.
- Erkennung: alle sichtbaren Würfelseiten werden per Mehrheitsentscheid fusioniert und geglättet (`js/tracker.js`); kurze Aussetzer überbrückt der Lagesensor des iPads (einmal „Tippen zum Starten“).
- Kameradaten werden passend zum Seitenverhältnis des Kamerabilds erzeugt (Bildwinkel Standard 60°, änderbar mit `fov=`), ein Rest-Unterschied wird aus mehreren sichtbaren Würfelseiten selbst korrigiert.
- URL-Parameter: `ansicht=neutral|thema`, `fov=60`, `aufl=niedrig` (schnellere Auswertung für ältere Geräte), `schwelle=otsu`, `gyro=0`, `debug=1`.

## Tafelansicht
`tafel.html` – Bastelwürfel bzw. Modell zum Drehen am ActiveBoard (Finger/Maus, Pinch/Mausrad), Schnellknöpfe für Standardansichten. Direkt mit Modell: `tafel.html?m=villa`.
