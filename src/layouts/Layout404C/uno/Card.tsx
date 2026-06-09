import type { CSSProperties } from "react";
import type { Card } from "./cards";
import { cardLabel } from "./cards";
import { CARD_BACK } from "./cardBack";

interface CardViewProps {
  card: Card;
  onClick?: () => void;
  playable?: boolean;
  dim?: boolean;
  style?: CSSProperties;
  className?: string;
}

export function CardView({ card, onClick, playable, dim, style, className = "" }: CardViewProps) {
  const cls = ["uno-card", playable ? "is-playable" : "", dim ? "is-dim" : "", className]
    .filter(Boolean)
    .join(" ");
  if (onClick) {
    return (
      <button type="button" className={cls} style={style} onClick={onClick} title={cardLabel(card)}>
        <img className="uno-card-img" src={card.asset} alt={cardLabel(card)} />
      </button>
    );
  }
  return (
    <div className={cls} style={style}>
      <img className="uno-card-img" src={card.asset} alt={cardLabel(card)} />
    </div>
  );
}

export function CardBack({ style, className = "" }: { style?: CSSProperties; className?: string }) {
  return (
    <div className={`uno-card ${className}`} style={style} aria-hidden="true">
      <img className="uno-card-img" src={CARD_BACK} alt="" />
    </div>
  );
}
