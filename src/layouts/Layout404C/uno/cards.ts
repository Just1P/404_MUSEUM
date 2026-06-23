// Modèle de carte UNO + construction du paquet, à partir des assets pixel-art.

const assets = import.meta.glob("../../../assets/uno/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const assetByName: Record<string, string> = {};
for (const [path, src] of Object.entries(assets)) {
  const name = path.split("/").pop()!.replace(".png", "");
  assetByName[name] = src;
}

export type UnoColor = "red" | "green" | "blue" | "yellow";
export const COLORS: UnoColor[] = ["red", "green", "blue", "yellow"];

const COLOR_FILE: Record<UnoColor, string> = {
  red: "Red",
  green: "Green",
  blue: "Blue",
  yellow: "Yellow",
};
const COLOR_FR: Record<UnoColor, string> = {
  red: "rouge",
  green: "vert",
  blue: "bleu",
  yellow: "jaune",
};
export const colorName = (c: UnoColor) => COLOR_FR[c];

export type CardType = "number" | "skip" | "reverse" | "draw2" | "wild" | "wild4";

export interface Card {
  id: string;
  type: CardType;
  color?: UnoColor;
  value?: number;
  asset: string;
}

let counter = 0;
const nextId = () => `card-${counter++}`;

const numberAsset = (c: UnoColor, n: number) =>
  assetByName[`UNO-${COLOR_FILE[c]}-${n}`];

const ACTION_FILE: Record<"skip" | "reverse" | "draw2", string> = {
  skip: "Cancel",
  reverse: "Reverse",
  draw2: "Plus2",
};
const actionAsset = (c: UnoColor, t: "skip" | "reverse" | "draw2") =>
  assetByName[`UNO-${COLOR_FILE[c]}-${ACTION_FILE[t]}`];

const WILD = assetByName["UNO-Special-Color"];
const WILD4 = assetByName["UNO-Special-Plus4"];

// Paquet officiel de 108 cartes.
export function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const color of COLORS) {
    deck.push({ id: nextId(), type: "number", color, value: 0, asset: numberAsset(color, 0) });
    for (let n = 1; n <= 9; n++) {
      for (let k = 0; k < 2; k++) {
        deck.push({ id: nextId(), type: "number", color, value: n, asset: numberAsset(color, n) });
      }
    }
    for (const t of ["skip", "reverse", "draw2"] as const) {
      for (let k = 0; k < 2; k++) {
        deck.push({ id: nextId(), type: t, color, asset: actionAsset(color, t) });
      }
    }
  }
  for (let k = 0; k < 4; k++) deck.push({ id: nextId(), type: "wild", asset: WILD });
  for (let k = 0; k < 4; k++) deck.push({ id: nextId(), type: "wild4", asset: WILD4 });
  return deck;
}

// Tri d'affichage : par couleur (ordre COLORS), puis chiffres, puis cartes action ;
// les jokers (sans couleur) en dernier.
const TYPE_RANK: Record<CardType, number> = {
  number: 0,
  skip: 1,
  reverse: 2,
  draw2: 3,
  wild: 4,
  wild4: 5,
};

export function sortHand(cards: Card[]): Card[] {
  return cards.slice().sort((a, b) => {
    const ca = a.color ? COLORS.indexOf(a.color) : COLORS.length;
    const cb = b.color ? COLORS.indexOf(b.color) : COLORS.length;
    if (ca !== cb) return ca - cb;
    if (a.type !== b.type) return TYPE_RANK[a.type] - TYPE_RANK[b.type];
    return (a.value ?? 0) - (b.value ?? 0);
  });
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

// Une carte est jouable si même couleur, même valeur/type, ou si c'est un joker.
export function isPlayable(card: Card, color: UnoColor, top: Card): boolean {
  if (card.type === "wild" || card.type === "wild4") return true;
  if (card.color === color) return true;
  if (card.type === "number" && top.type === "number") return card.value === top.value;
  if (card.type !== "number" && card.type === top.type) return true;
  return false;
}

export function cardLabel(card: Card): string {
  if (card.type === "wild") return "Joker";
  if (card.type === "wild4") return "Joker +4";
  const c = card.color ? colorName(card.color) : "";
  if (card.type === "number") return `${c} ${card.value}`;
  if (card.type === "skip") return `${c} sauté`;
  if (card.type === "reverse") return `${c} inversion`;
  return `${c} +2`;
}

// Toutes les cartes (hors carte blanche) pour la forme "404".
export const SHAPE_CARDS: string[] = Object.entries(assetByName)
  .filter(([name]) => !name.includes("Blank"))
  .map(([, src]) => src);

// Position/visuel d'une carte du "404" capturée avant le regroupement.
export interface CapturedCard {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
}
