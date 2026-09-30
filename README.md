# 3D-Lernmodelle

AR-Anschauungsmodelle (Technik, Physik, Mathematik) auf einem selbst gebastelten Markerwürfel – im iPad-Browser, ohne App.

**Start:** https://semmikgs.github.io/3d-lernmodelle/

1. Würfel aus `marker/wuerfel-vorlage.pdf` drucken (100 %), falten, kleben.
2. Modell über die Startseite oder per QR-Code öffnen, Kamera erlauben.
3. Würfel vor die Kamera halten.

Neues Modell: `.glb` in `modelle/` ablegen und in `modelle/liste.js` eintragen (optional mit Untermenü `teile` – die IDs sind Gruppennamen im Modell).

Direktlink auf einen Raum: `viewer.html?m=villa&r=atrium`

Die Modelle werden per Skript erzeugt (`quellen/`, benötigt Node + `npm i three`): `node quellen/villa.mjs modelle`

Technik: three.js + AR.js (ARToolKit, 3×3-Barcode-Marker 1–6).
