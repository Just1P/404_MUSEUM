// Logique de jeu UNO (duel joueur / bot) — fonctions pures sur GameState.

import { buildDeck, shuffle, isPlayable, COLORS, colorName } from "./cards";
import type { Card, UnoColor } from "./cards";

export type Player = "human" | "bot";

export interface GameState {
  drawPile: Card[];
  discard: Card[]; // dernier élément = sommet
  hands: Record<Player, Card[]>;
  current: Player;
  color: UnoColor; // couleur active (utile après un joker)
  status: "playing" | "choosingColor" | "over";
  pendingWild: Card | null; // joker du joueur en attente de couleur
  justDrew: string | null; // id de la carte que le joueur vient de piocher
  winner: Player | null;
  unoPending: boolean; // le joueur doit crier UNO
  message: string;
}

const top = (s: GameState) => s.discard[s.discard.length - 1];
const other = (p: Player): Player => (p === "human" ? "bot" : "human");

export function startGame(): GameState {
  let deck = shuffle(buildDeck());
  const human: Card[] = [];
  const bot: Card[] = [];
  for (let i = 0; i < 7; i++) {
    human.push(deck.pop()!);
    bot.push(deck.pop()!);
  }
  // Première carte de la défausse : on force un chiffre pour éviter les cas limites.
  let first = deck.pop()!;
  const buffer: Card[] = [];
  while (first.type !== "number") {
    buffer.push(first);
    first = deck.pop()!;
  }
  deck = shuffle(deck.concat(buffer));
  return {
    drawPile: deck,
    discard: [first],
    hands: { human, bot },
    current: "human",
    color: first.color!,
    status: "playing",
    pendingWild: null,
    justDrew: null,
    winner: null,
    unoPending: false,
    message: "",
  };
}

// Recompose la pioche depuis la défausse si elle est vide.
function ensureDraw(s: GameState): GameState {
  if (s.drawPile.length > 0) return s;
  const t = top(s);
  return { ...s, drawPile: shuffle(s.discard.slice(0, -1)), discard: [t] };
}

function drawN(s: GameState, player: Player, n: number): GameState {
  let st = s;
  const drawn: Card[] = [];
  for (let i = 0; i < n; i++) {
    st = ensureDraw(st);
    if (st.drawPile.length === 0) break;
    drawn.push(st.drawPile[st.drawPile.length - 1]);
    st = { ...st, drawPile: st.drawPile.slice(0, -1) };
  }
  return { ...st, hands: { ...st.hands, [player]: [...st.hands[player], ...drawn] } };
}

const drawMsg = (victim: Player, n: number) =>
  victim === "human"
    ? `Tu pioches ${n} cartes et passes ton tour.`
    : `Le bot pioche ${n} cartes et passe son tour.`;

// Pose effective d'une carte (commune au joueur et au bot).
function applyPlay(s: GameState, player: Player, card: Card, chosen?: UnoColor): GameState {
  const opp = other(player);
  const hand = s.hands[player].filter((c) => c.id !== card.id);
  let st: GameState = {
    ...s,
    hands: { ...s.hands, [player]: hand },
    discard: [...s.discard, card],
    justDrew: null,
    pendingWild: null,
    status: "playing",
  };

  const newColor: UnoColor =
    card.type === "wild" || card.type === "wild4" ? chosen! : card.color!;
  st = { ...st, color: newColor };

  if (hand.length === 0) {
    return {
      ...st,
      status: "over",
      winner: player,
      current: player,
      unoPending: false,
      message: player === "human" ? "Tu as gagné ! 🎉" : "Le bot a gagné…",
    };
  }

  // En duel, Skip et Reverse font rejouer le même joueur (l'adversaire saute).
  let next: Player;
  let message: string;
  switch (card.type) {
    case "skip":
    case "reverse":
      next = player;
      message =
        player === "human" ? "Carte sautée : le bot passe son tour." : "Le bot te fait sauter ton tour.";
      break;
    case "draw2":
      st = drawN(st, opp, 2);
      next = player;
      message = drawMsg(opp, 2);
      break;
    case "wild4":
      st = drawN(st, opp, 4);
      next = player;
      message = `Joker +4 ! ${drawMsg(opp, 4)}`;
      break;
    case "wild":
      next = opp;
      message = `Joker : couleur ${colorName(newColor)}.`;
      break;
    default:
      next = opp;
      message =
        player === "human" ? "Au tour du bot." : `Le bot joue ${colorName(newColor)} ${card.value}.`;
  }

  const unoPending = player === "human" ? hand.length === 1 : false;
  if (player === "bot" && hand.length === 1) message = "Le bot crie UNO !";

  return { ...st, current: next, unoPending, message: message || s.message };
}

export function playHuman(s: GameState, cardId: string): GameState {
  if (s.current !== "human" || s.status !== "playing") return s;
  if (s.justDrew && cardId !== s.justDrew)
    return { ...s, message: "Joue la carte piochée ou passe." };
  const card = s.hands.human.find((c) => c.id === cardId);
  if (!card) return s;
  if (!isPlayable(card, s.color, top(s)))
    return { ...s, message: "Cette carte n'est pas jouable." };
  if (card.type === "wild" || card.type === "wild4") {
    return { ...s, status: "choosingColor", pendingWild: card, message: "Choisis une couleur." };
  }
  return applyPlay(s, "human", card);
}

export function chooseColor(s: GameState, color: UnoColor): GameState {
  if (s.status !== "choosingColor" || !s.pendingWild) return s;
  return applyPlay(s, "human", s.pendingWild, color);
}

export function drawHuman(s: GameState): GameState {
  if (s.current !== "human" || s.status !== "playing" || s.justDrew) return s;
  const st = drawN(s, "human", 1);
  const drew = st.hands.human[st.hands.human.length - 1];
  if (isPlayable(drew, st.color, top(st))) {
    return { ...st, justDrew: drew.id, message: "Carte piochée : joue-la ou passe." };
  }
  return { ...st, current: "bot", justDrew: null, message: "Rien à jouer, tu passes." };
}

export function passHuman(s: GameState): GameState {
  if (s.current !== "human" || !s.justDrew) return s;
  return { ...s, current: "bot", justDrew: null, message: "Tu passes." };
}

export function callUno(s: GameState): GameState {
  if (!s.unoPending) return s;
  return { ...s, unoPending: false, message: "UNO ! Bien joué." };
}

export function unoPenalty(s: GameState): GameState {
  if (!s.unoPending) return s;
  const st = drawN(s, "human", 2);
  return { ...st, unoPending: false, message: "Oublié de crier UNO ! +2 cartes." };
}

function bestBotColor(hand: Card[]): UnoColor {
  const counts: Record<UnoColor, number> = { red: 0, green: 0, blue: 0, yellow: 0 };
  for (const c of hand) if (c.color) counts[c.color]++;
  let best = COLORS[Math.floor(Math.random() * COLORS.length)];
  let max = -1;
  for (const c of COLORS) {
    if (counts[c] > max) {
      max = counts[c];
      best = c;
    }
  }
  return best;
}

// Heuristique simple : agressif (draw2/skip), garde les jokers pour la fin.
function rank(c: Card, color: UnoColor): number {
  switch (c.type) {
    case "draw2": return 5;
    case "skip": return 4.5;
    case "reverse": return 4;
    case "number": return 2 + (c.color === color ? 0.4 : 0) + (c.value ?? 0) / 100;
    case "wild": return 1;
    case "wild4": return 0.6;
    default: return 0;
  }
}

export function botMove(s: GameState): GameState {
  if (s.current !== "bot" || s.status !== "playing") return s;
  const playable = s.hands.bot.filter((c) => isPlayable(c, s.color, top(s)));
  if (playable.length === 0) {
    const st = drawN(s, "bot", 1);
    const drew = st.hands.bot[st.hands.bot.length - 1];
    if (isPlayable(drew, st.color, top(st))) return botPlay(st, drew);
    return { ...st, current: "human", message: "Le bot pioche et passe." };
  }
  const choice = playable.slice().sort((a, b) => rank(b, s.color) - rank(a, s.color))[0];
  return botPlay(s, choice);
}

function botPlay(s: GameState, card: Card): GameState {
  const chosen =
    card.type === "wild" || card.type === "wild4" ? bestBotColor(s.hands.bot) : undefined;
  return applyPlay(s, "bot", card, chosen);
}
