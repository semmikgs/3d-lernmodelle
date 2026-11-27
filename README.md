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

**Moleküle und Gitter** (`?m=molekuel`): 25 Moleküle mit Raumstruktur nach dem EPA-Modell (Bindungslängen aus Tabellen, Winkel 104,5°/107°/109,5°/120°/180°), freie Elektronenpaare, Partialladungen und Dipol; Kugel-Stab- und Kalottenmodell. Gitter: NaCl, CsCl, Kupfer, Eisen, Diamant, Graphit (`&s=wasser|nacl|…&d=kugelstab|kalotte|kugeln|gitter&n=1…3`).

**Teilchenmodell** (`?m=teilchen&t=20`): Molekulardynamik mit 108 Lennard-Jones-Teilchen, Schwerkraft und Thermostat; fest/flüssig/gasförmig entstehen von selbst. Temperaturskala kalibriert: Ordnung (Teilchen mit ≥ 10 Nachbarn) bricht zwischen T* 0,35 und 0,5 ein → 0 °C bei T* 0,44; Anteil kondensierter Teilchen fällt bei T* ≈ 0,9 unter 50 % → 100 °C.

**Mond** (`?m=mond&v=phasen|acht|mofi|sofi|neigung`): Mondphasen mit „Blick von der Erde“, acht Phasen, Mond- und Sonnenfinsternis; Kern- und Halbschatten im Shader berechnet (Öffnung = scheinbare Sonnengröße), Erde und Mond im echten Größenverhältnis, Abstand auf 1/10 verkürzt.

**Cheops-Pyramide** (`?m=pyramide&v=schnitt|damals|heute|bau`): Längsschnitt mit Gängen, Kammern, Schächten (Maße nach Vermessungen, Lage vereinfacht), damals mit Verkleidung, heute als Stufenkern, Bau nach der Theorie der umlaufenden Rampe (animiert).

**Herz** (`?m=herz&v=herz|kreislauf`): Frontalschnitt mit vier Räumen, Segel- und Taschenklappen, Sehnenfäden und Gefäßen; Herzzyklus (Diastole/Systole, verlangsamt) mit Klappenbewegung und Blutteilchen, die nur bei offener Klappe weiterfließen; doppelter Blutkreislauf mit Farbwechsel in den Kapillaren.

**Magnetfeld** (`?m=magnet&q=stab|hufeisen|anziehen|abstossen|spule|erde&r=0|1`): Feldlinien numerisch aus dem Feld verfolgt (Magnete und Spule über Biot-Savart, Erde als geneigter Dipol), Pfeile in Feldrichtung, geschlossene Linien durch das Magnetinnere; Kompassnadeln richten sich nach dem berechneten Feld; „Räumlich“ zeigt Linien rundum statt nur in der Bildebene.

**Getriebe** (`?m=zahnrad&a=paar|zwischen|stufen&z=z1-z2-z3-z4`): Stirnräder mit Evolventenverzahnung (20°, Modul 1), exakt kämmend über die Phasenbedingung je Eingriff; Zähnezahlen 8–60 wählbar; Drehzahlen, Drehrichtungen und Übersetzung werden berechnet; Teilkreise mit Wälzpunkt zuschaltbar.

**Platonische Körper** (`?m=ikosaeder&k=tetraeder|hexaeder|oktaeder|dodekaeder|ikosaeder&v=koerper|netz&a=4`): Ecken, Kanten, Flächen, Euler-Formel, Oberfläche und Volumen; das Netz wird als überlappungsfreier Spannbaum der Flächen berechnet und klappt an den Kanten auf und zu.

**Tierzelle** (`?m=tierzelle&s=lm|em&o=alle|kern|mito|…`): vorne aufgeschnittene Tierzelle in µm (Ø ca. 22 µm, Kern 6 µm); Stufe Lichtmikroskop (Membran, Plasma, Kern) oder Elektronenmikroskop mit Kernhülle und -poren, Nukleolus, rauem ER mit Ribosomen (an die Kernhülle anschließend), glattem ER, Golgi-Apparat mit Vesikeln, Mitochondrien (teils aufgeschnitten mit Cristae), Lysosomen, Zentriolen (9 Tripletts) und Mikrotubuli; jedes Organell einzeln hervorhebbar; Vergleich zur Pflanzenzelle im Infotext.

**Steinzeitliches Langhaus** (`?m=langhaus&v=aussen|innen|bau|befund`): bandkeramisches Langhaus (ca. 5500–4900 v. Chr.), 30 × 6,5 m, fünf Pfostenreihen (drei tragende Innenreihen als Querjoche), Flechtwerk mit Lehm, Spaltbohlenwand im Nordwesten, Längsgruben; Innenleben (Herd, Webstuhl, Mahlstein, Vorratsgefäße, Dachboden), Bau in fünf Schritten, Grabungsbefund mit Pfostenlöchern.

**Mittelalterliche Burg** (`?m=burg&v=burg|bergfried|palas`): Spornburg um 1200 auf berechnetem Gelände (Bergsporn, Halsgraben zur ansteigenden Bergseite), Schildmauer, Bergfried mit Hocheingang, Palas mit Aborterker, Kapelle mit Apsis, Brunnen, Torhaus mit Fallgatter und Zugbrücke, Vorburg mit Wirtschaftsbauten, Burgweg; Bergfried (Verlies mit Angstloch, Geschosse, Wehrplatte) und Palas (Keller, Küche, Rittersaal, Kemenate) im Schnitt.

**Vulkan im Schnitt** (`?m=vulkan&t=schicht|schild&a=0|1`): Blockbild, vorne durch den Schlot aufgeschnitten; Schnittfläche pro Bildpunkt aus Profil berechnet (Schichtvulkan: Wechsel Asche/Lava parallel zur Flanke, Nebenschlot; Schildvulkan: dünne Basaltdecken), Magmakammer, Untergrund; Ausbruch animiert (Aschewolke, Lavabomben, Glutlawine bzw. Lavafontäne, Lavaströme, Lavasee). Berge überhöht (1,5- bzw. 3-fach), angegeben am Maßstab.

**Glaziale Serie** (`?m=glazial&v=eiszeit|heute`): Blockbild Norden → Süden mit Zungenbecken, Grundmoräne, bogenförmiger Endmoräne, Sander und Urstromtal (Höhen stark überhöht); Schnittfläche pro Bildpunkt (Geschiebemergel, Blockpackung, nach Korngröße sortierte Sander-Schichten, Talsand, Eis); Eiszeit mit Inlandeis, Gletschertoren und fließendem Schmelzwasser, heute mit See, Söllen, Äckern, Wald, Heide/Kiefern, Fluss mit Wiesen und Moor, Findlingen.

**Kohlenwasserstoffe im Molekülgenerator** (`?m=molekuel&s=decan|methylbutan|cisbut2en|…`): Alkane Methan–Decan, Isomere (Isobutan, Isopentan, Neopentan), Alkene und Alkine inkl. cis/trans-But-2-en; aus dem Kohlenstoffgerüst erzeugt (H füllt auf), Halbstrukturformel, allgemeine Formel, Siedetemperatur und Aggregatzustand; cis/trans über die Lage am zweiten sp²-Atom (C–C-Abstand cis 2,9 Å, trans 3,9 Å geprüft).

**Atmung** (`?m=atmung&v=lunge|blaeschen`): Atemwege von vorne (Kehlkopf, Luftröhre mit Knorpelspangen, rekursiver Bronchialbaum – rechts kürzer und steiler), Lungenflügel mit 3/2 Lappen und Herzbucht, Herz, Zwerchfell, Brustkorb; Atembewegung (Zwerchfell senkt sich, Rippen heben sich, Lunge dehnt sich, Luftteilchen strömen) mit Phasenanzeige. Lungenbläschen mit Kapillarnetz (blau → rot), roten Blutkörperchen und O₂/CO₂-Diffusion.

**Ohr und Hören** (`?m=ohr&v=ohr|schnecke&t=tief|mittel|hoch`): Frontalschnitt des rechten Ohrs in mm (Schnittbild pro Bildpunkt: Haut/Knorpel, Schläfenbein, Gehörgang, Paukenhöhle, Ohrtrompete) mit 3D-Gehörknöchelchen, Trommelfell, Bogengängen, Schnecke (2¾ Windungen) und Hörnerv; Schallwellen, Trommelfell, Hammer/Amboss (Drehachse) und Steigbügel animiert. Abgerollte Schnecke mit Wanderwelle, Maximum nach Greenwood-Funktion (200 Hz / 1 kHz / 8 kHz), Frequenzskala.

**Satz des Pythagoras** (`?m=pythagoras&v=quadrate|beweis|raum&a=3&b=4&h=2`): Quadrate über den Seiten mit Einheitskästchen (bei ganzzahligen Tripeln auch auf c²), animierter Ergänzungsbeweis (vier kongruente Dreiecke werden orientierungstreu umgelegt, c² ↔ a² + b²), Flächen- und Raumdiagonale im Quader mit den beiden rechtwinkligen Dreiecken.

**Küste** (`?m=kueste&v=watt|deich&s=0|1`): Blockbild Geest – Marsch mit Warft – Deich mit Siel – Salzwiese – Watt mit Prielen – Düneninsel – Seegat – Nordsee (Höhen m NHN, überhöht, Schnittbild mit Sand/Klei/Torf/Schlick), Gezeiten animiert (MNW −1,4 m, MHW +1,5 m, 12 h 25 min in 24 s, Uhr „nach Hochwasser“). Seedeich maßstäblich im Schnitt (Krone +8,5 m, außen 1:6, innen 1:3, Sandkern, Kleidecke, Deckwerk, Verteidigungsweg), Pegelmarken und Sturmflut (+5 m) mit Wellenauflauf.

**Klimazonen und Höhenstufen** (`?m=klima&v=zonen|alpen|anden`): Globus mit vereinfachten Klimazonen-Gürteln, Äquator, Wende- und Polarkreisen und zwei gleich breiten Lichtbündeln (Lichtfleck am Äquator vs. 60° Breite = doppelte Fläche); Höhenstufen der Alpen (kollin bis nival, Wald- und Schneegrenze) und der tropischen Anden (Tierra caliente bis nevada) mit Höhenskala und Temperatur (−0,65 °C/100 m), Höhen doppelt überhöht.

**Limes** (`?m=limes&v=grenze|kastell`): Abschnitt des Obergermanischen Limes in m (Palisade aus Instanzen, Graben und Wall mit Durchgang, verputzte Steintürme mit Obergeschoss-Eingang, Galerie und Leiter, Signalfeuer, Händler am Tor, germanischer Wald vs. römische Felder) und Kohortenkastell im Maß der Saalburg (147 × 221 m, Spielkartenform, Doppelgräben, vier Tore, principia, praetorium, horrea, Baracken, vicus mit Thermen).

**Computer** (`?m=computer&v=pc|eva&o=alle|cpu|ram|ssd|gpu|…`): geöffneter Tower mit ATX-Mainboard (Leiterbahn-Textur), CPU mit Kühler und drehendem Lüfter, RAM-Modulen, M.2- und 2,5"-SSD, Grafikkarte, Netzteil mit Kabel, I/O-Anschlüssen; jedes Bauteil hervorhebbar mit Erklärung. EVA-Prinzip: Taste „A“ → Bitfolge 01000001 über den Bus zu CPU/RAM, SSD und Monitor, Schritte als Anzeige.

**Codierung** (`?m=codierung&v=binaer|text|bild&z=42&t=KGS&f=0|1`): 8 Lampen mit Stellenwerten 128…1 und Summenzeile (Zählen 0–255), eigener Text als ASCII-Lampenreihen mit Dezimalcode (Nicht-ASCII markiert), 16 × 16-Pixelbild schwarz-weiß (1 Bit, 0/1 auf den Pixeln) oder RGB (24 Bit) mit auseinandergezogenen Farbebenen und Speicherbedarf.

**Tropischer Regenwald** (`?m=regenwald&o=alle|riesen|krone|unten|strauch|kraut`): Waldstück 50 × 24 m mit Höhen 1 : 1 (Urwaldriesen bis 62 m mit Brettwurzeln und Schirmkronen, geschlossenes Kronendach 30–40 m, untere Baumschicht mit Palmen, Strauchschicht mit Baumfarnen, spärliche Krautschicht), Lianen, Epiphyten, Lichtsäulen mit abnehmender Helligkeit, Tiersymbole je Stockwerk, Höhenskala mit Lichtanteil; Boden im Schnitt mit dünner Humusschicht über rotem Latosol und flachen Wurzeln; Stockwerke einzeln hervorhebbar.

Hinweis: Die Gastseiten (Tafel, Viewer) setzen die Position des Generator-Objekts nicht mehr zurück, damit Verschiebungen aus den Generatoren wirken.

**Tafel-Bedienleiste (überarbeitet):** eine Zeile; Modell-Einstellungen („⚙ Einstellungen“), Blickrichtungen („👁 Ansicht“) und Verschiebe-Pfeile („✥“) klappen als Felder über der Leiste auf und verdecken das Modell nur, solange sie offen sind. Standard beim Start: Info aus, Beschriftungen aus, Bewegung/Animationen angehalten (glTF-Animationen starten pausiert).

**Überarbeitung Herz und Atmung:** Herz im Schnitt jetzt mit gewölbtem 3D-Herzkörper, Schnittfläche (Muskeltextur) mit zwei durchgehenden Hohlräumen (Vorhof – Segelklappe – Kammer – Ausflussbahn – Taschenklappe), gerundeten Innenwänden, Verformung der Kammern im Herzzyklus, gebogenen Segeln mit Sehnenfäden, anatomischen Gefäßverläufen (Aortenbogen mit Abgängen, Lungenarterie, Hohlvenen hinten, Herzkranzgefäß). Lunge: ellipsoidische Lungenflügel mit flacher Innenseite, Herzbucht und hohler Basis auf den Zwerchfellkuppeln, Lappen farbig mit berechneten Spaltlinien, Bronchialbaum (rechts 3, links 2 Lappenbronchien, je 5 Generationen innerhalb der Lunge) mit Bläschen, 12 Rippenpaare mit Knorpel, Brustbein, Wirbelsäule, Schlüsselbeine; Atembewegung verformt Lunge und Zwerchfell, Luftteilchen folgen den Bronchien.
