// Animationssteuerung für Modelle mit glTF-Animationsclips (Viewer und Tafel).
// Abspielen/Pause-Knopf und Zeitregler; ein Clip läuft in Endlosschleife.
import * as THREE from 'three';

export class Animation {
  constructor(knopf, regler) {
    this.knopf = knopf; this.regler = regler;
    this.mixer = null; this.clips = []; this.aktion = null; this.laeuft = false;
    knopf.onclick = () => this.umschalten(!this.laeuft);
    regler.addEventListener('input', () => {
      if (!this.aktion) return;
      this.umschalten(false);
      this.aktion.time = +regler.value * this.aktion.getClip().duration;
      this.mixer.update(0);
    });
  }
  // neues Modell geladen
  setze(inhalt, clips) {
    if (this.mixer) this.mixer.stopAllAction();
    this.mixer = clips && clips.length ? new THREE.AnimationMixer(inhalt) : null;
    this.clips = clips || []; this.aktion = null; this.anzeigen(false);
  }
  // Clip nach Name starten (null = keine Animation)
  starte(name) {
    if (!this.mixer) return this.anzeigen(false);
    this.mixer.stopAllAction(); this.aktion = null;
    const clip = name && this.clips.find(c => c.name === name);
    if (!clip) return this.anzeigen(false);
    this.aktion = this.mixer.clipAction(clip); this.aktion.reset().play();
    this.mixer.update(0);
    this.anzeigen(true); this.umschalten(true);
  }
  umschalten(an) { this.laeuft = an; this.knopf.textContent = an ? '⏸ Pause' : '▶ Abspielen'; this.knopf.classList.toggle('on', an); }
  anzeigen(an) { this.knopf.hidden = !an; this.regler.hidden = !an; if (!an) this.laeuft = false; }
  update(dt) {
    if (!this.aktion) return;
    if (this.laeuft) this.mixer.update(dt);
    const d = this.aktion.getClip().duration;
    this.regler.value = ((this.aktion.time % d) + d) % d / d;
  }
}
