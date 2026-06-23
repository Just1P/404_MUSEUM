import { useState } from "react";
import "./Layout404C.css";
import { Shape404 } from "./Shape404";
import { UnoBoard } from "./uno/UnoBoard";
import { startGame } from "./uno/engine";
import type { GameState } from "./uno/engine";
import type { CapturedCard } from "./uno/cards";

type Phase = "shape" | "game";

export default function Layout404C() {
  const [phase, setPhase] = useState<Phase>("shape");
  // Partie créée au clic, partagée entre le regroupement et le plateau (même composant).
  const [session, setSession] = useState<{ cards: CapturedCard[]; game: GameState } | null>(null);

  if (phase === "game" && session) {
    return (
      <UnoBoard
        initial={session.game}
        captured={session.cards}
        onExit={() => {
          setSession(null);
          setPhase("shape");
        }}
      />
    );
  }

  return (
    <Shape404
      onStart={(cards) => {
        setSession({ cards, game: startGame() });
        setPhase("game");
      }}
    />
  );
}
