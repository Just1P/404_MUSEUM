// SFX du jeu UNO : sons de cartes (pose, pioche, mélange).
// Les fichiers sont chargés via Vite (URL hashée en build).

import deal1 from "../../../assets/uno/sfx/deal-1.mp3";
import deal2 from "../../../assets/uno/sfx/deal-2.mp3";
import shuffle1 from "../../../assets/uno/sfx/shuffle-1.mp3";
import draw1 from "../../../assets/uno/sfx/draw-1.mp3";

export type SfxName = "play" | "draw" | "shuffle";

// Plusieurs sources par effet pour varier le rendu (la pose alterne deux samples).
const SOURCES: Record<SfxName, string[]> = {
  play: [deal1, deal2],
  draw: [draw1],
  shuffle: [shuffle1],
};

// Pool d'éléments audio préchargés et clonables, pour permettre les sons rapprochés.
const cache = new Map<string, HTMLAudioElement>();

function get(src: string): HTMLAudioElement {
  let a = cache.get(src);
  if (!a) {
    a = new Audio(src);
    a.preload = "auto";
    cache.set(src, a);
  }
  return a;
}

let pick = 0;

export function playSfx(name: SfxName, volume = 0.5) {
  if (typeof window === "undefined") return;
  const list = SOURCES[name];
  if (!list || !list.length) return;
  const src = list[pick++ % list.length];
  // Clone pour autoriser des lectures qui se chevauchent (ex. +2 / +4).
  const node = get(src).cloneNode() as HTMLAudioElement;
  node.volume = volume;
  // Un échec (autoplay bloqué tant que l'utilisateur n'a pas interagi) est sans gravité.
  node.play().catch(() => {});
}
