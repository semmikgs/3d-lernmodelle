// Modellgeneratoren: erzeugen Modelle direkt im Browser statt aus einer .glb-Datei.
// Eintrag in modelle/liste.js mit generator: '<name>'. Ein Generator-Modul liefert:
//   standard(), ausUrl(URLSearchParams), zuUrl(zustand), erzeuge(zustand) → { objekt, radius, titel, info, update(dt) },
//   entsorge(objekt), bedienung(container, zustand, neu)
export const GENERATOREN = {
  atom: () => import('./atom.js'),
  dna: () => import('./dna.js'),
  auge: () => import('./auge.js'),
  erdbahn: () => import('./erdbahn.js'),
  koerper: () => import('./koerper.js'),
  motor: () => import('./motor.js'),
  molekuel: () => import('./molekuel.js'),
  teilchen: () => import('./teilchen.js'),
  mond: () => import('./mond.js'),
  pyramide: () => import('./pyramide.js'),
  herz: () => import('./herz.js'),
  magnetfeld: () => import('./magnetfeld.js'),
  getriebe: () => import('./getriebe.js'),
  platonisch: () => import('./platonisch.js'),
};
