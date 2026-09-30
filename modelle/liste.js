// Modellliste für den Viewer.
// Schlüssel = Dateiname in /modelle (ohne .glb).
// Optional: info (Text zum ganzen Modell), teile (Untermenü; id = Gruppenname im Modell).
export const MODELLE = {
  zahnrad: { name: 'Zahnradgetriebe' },
  magnet: { name: 'Stabmagnet mit Feldlinien' },
  ikosaeder: { name: 'Ikosaeder' },
  villa: {
    name: 'Römische Villa (Stadthaus)',
    ganz: 'Ganze Villa',
    info: 'So wohnte eine reiche Familie in einer römischen Stadt wie Pompeji. Von der Straße aus sieht das Haus fast fensterlos aus – das Leben spielte sich innen ab, rund um Atrium und Garten. Wähle unten einen Raum aus!',
    teile: [
      { id: 'fauces', name: 'Fauces – Eingang',
        info: 'Durch diesen schmalen Flur betrat man das Haus von der Straße aus. Oft lag hier ein Mosaik mit einem Wachhund und der Warnung „Cave canem“ – Hüte dich vor dem Hund!' },
      { id: 'atrium', name: 'Atrium – Empfangshalle',
        info: 'Der wichtigste Raum des Hauses. Durch eine Öffnung im Dach (Compluvium) fiel Licht herein und Regenwasser in das Becken (Impluvium). Morgens empfing der Hausherr hier Besucher. Am Hausaltar (Lararium) wurden die Schutzgötter der Familie verehrt.' },
      { id: 'cubicula', name: 'Cubicula – Schlafzimmer',
        info: 'Kleine, meist fensterlose Schlafzimmer rund um das Atrium. Darin standen nur ein Bett, eine Truhe für Kleidung und vielleicht ein Hocker.' },
      { id: 'latrina', name: 'Latrina – Toilette',
        info: 'Man saß auf einer Steinbank mit Löchern, darunter floss das Abwasser weg. Toilettenpapier gab es nicht – stattdessen einen Schwamm an einem Stock, der in der Wasserrinne ausgewaschen wurde.' },
      { id: 'tablinum', name: 'Tablinum – Arbeitszimmer',
        info: 'Hier arbeitete der Hausherr (pater familias). Im Schrank lagen Schriftrollen und wichtige Dokumente. Vom Tablinum aus konnte man vom Atrium bis in den Garten blicken.' },
      { id: 'triclinium', name: 'Triclinium – Speisezimmer',
        info: 'Die Römer aßen im Liegen! Drei Liegen standen im U um einen kleinen Tisch – daher der Name (tri = drei). Beim Gastmahl gab es viele Gänge, Diener trugen die Speisen auf.' },
      { id: 'culina', name: 'Culina – Küche',
        info: 'Gekocht wurde auf einem gemauerten Herd über offenem Feuer. In Amphoren lagerten Öl, Wein und die beliebte Fischsoße Garum. Meist arbeiteten hier Sklavinnen und Sklaven.' },
      { id: 'peristyl', name: 'Peristyl – Garten',
        info: 'Ein Garten, umgeben von einem Säulengang. Hier wuchsen Kräuter, Blumen und Obstbäume, ein Brunnen plätscherte, Statuen schmückten die Beete. Ein ruhiger Ort zum Erholen.' },
      { id: 'tabernae', name: 'Tabernae – Läden',
        info: 'Läden an der Straßenseite, oft vom Hausbesitzer vermietet. Links ein Weinladen mit Theke und eingelassenen Vorratsgefäßen, rechts eine Bäckerei mit Backofen und Getreidemühle.' },
    ],
  },
};
