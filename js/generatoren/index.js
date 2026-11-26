// Modellgeneratoren: erzeugen Modelle direkt im Browser statt aus einer .glb-Datei.
// Eintrag in modelle/liste.js mit generator: '<name>'. Ein Generator-Modul liefert:
//   standard(), ausUrl(URLSearchParams), zuUrl(zustand), erzeuge(zustand) → { objekt, radius, titel, info, update(dt) },
//   entsorge(objekt), bedienung(container, zustand, neu)
export const GENERATOREN = {
  atom: () => import('./atom.js'),
  dna: () => import('./dna.js'),
};
