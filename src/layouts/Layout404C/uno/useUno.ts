import { useEffect, useReducer } from "react";
import * as engine from "./engine";
import type { GameState } from "./engine";
import type { UnoColor } from "./cards";

export type UnoAction =
  | { kind: "play"; cardId: string }
  | { kind: "color"; color: UnoColor }
  | { kind: "draw" }
  | { kind: "pass" }
  | { kind: "callUno" }
  | { kind: "penalty" }
  | { kind: "bot" }
  | { kind: "restart" };

function run(state: GameState, action: UnoAction): GameState {
  switch (action.kind) {
    case "play": return engine.playHuman(state, action.cardId);
    case "color": return engine.chooseColor(state, action.color);
    case "draw": return engine.drawHuman(state);
    case "pass": return engine.passHuman(state);
    case "callUno": return engine.callUno(state);
    case "penalty": return engine.unoPenalty(state);
    case "bot": return engine.botMove(state);
    case "restart": return engine.startGame();
    default: return state;
  }
}

function reducer(state: GameState, action: UnoAction): GameState {
  const next = run(state, action);
  // L'obligation de crier UNO n'a de sens qu'avec exactement 1 carte.
  if (next.unoPending && next.hands.human.length !== 1) {
    return { ...next, unoPending: false };
  }
  return next;
}

export function useUno(initial?: GameState) {
  const [state, dispatch] = useReducer(reducer, initial, (arg) => arg ?? engine.startGame());

  // Tour du bot, joué après un court délai pour la lisibilité.
  useEffect(() => {
    if (state.status === "playing" && state.current === "bot") {
      // Délai assez long pour voir chaque carte (ex. blocage suivi d'un +2).
      const t = setTimeout(() => dispatch({ kind: "bot" }), 1400);
      return () => clearTimeout(t);
    }
  }, [state]);

  // Fenêtre pour crier UNO, sinon pénalité de 2 cartes.
  useEffect(() => {
    if (state.unoPending) {
      const t = setTimeout(() => dispatch({ kind: "penalty" }), 2500);
      return () => clearTimeout(t);
    }
  }, [state.unoPending]);

  return { state, dispatch };
}
