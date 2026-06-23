import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./uno.css";
import { useUno } from "./useUno";
import { CardView, CardBack } from "./Card";
import { isPlayable, colorName, COLORS } from "./cards";
import type { GameState } from "./engine";
import type { Card, CapturedCard } from "./cards";

type Anim = "gather" | "deal" | "flip" | "play";

// Tempo de l'intro (ms).
const GATHER_END = 750;
const STEP = 100; // décalage entre deux cartes distribuées
const DEAL_FLIGHT = 430;
const FLIP_END = 950;
const PLAY_FLIGHT = 420; // vol d'une carte jouée vers la défausse

interface Flying {
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  fx: number;
  fy: number;
  n: number;
}

interface DrawFlyer {
  n: number;
  x: number;
  y: number;
  w: number;
  h: number;
  fx: number;
  fy: number;
  delay: number;
}

export function UnoBoard({
  onExit,
  initial,
  captured = [],
}: {
  onExit: () => void;
  initial?: GameState;
  captured?: CapturedCard[];
}) {
  const { state, dispatch } = useUno(initial);
  const [anim, setAnim] = useState<Anim>("gather");
  const [deck, setDeck] = useState<{ x: number; y: number; w: number } | null>(null);
  const [gathered, setGathered] = useState(false);

  const top = state.discard[state.discard.length - 1];
  const human = state.hands.human;
  const bot = state.hands.bot;
  const mid = (human.length - 1) / 2;

  // Durée de l'intro figée au montage (sinon l'animation se rejoue à chaque coup).
  const [dealEnd] = useState(
    () => GATHER_END + (human.length + bot.length) * STEP + DEAL_FLIGHT,
  );

  // --- Animation "carte jouée -> défausse" ---
  const drawRef = useRef<HTMLButtonElement>(null);
  const discardRef = useRef<HTMLDivElement>(null);
  const botHandRef = useRef<HTMLDivElement>(null);
  const slotRefs = useRef<Map<string, HTMLElement>>(new Map());
  const playOrigin = useRef<DOMRect | null>(null);
  const prevLen = useRef(state.discard.length);
  const flyN = useRef(0);
  const [displayedTop, setDisplayedTop] = useState<Card>(top);
  const [fly, setFly] = useState<Flying | null>(null);

  // --- Animation "pioche -> main" (piocher, +2, +4) ---
  const playerHandRef = useRef<HTMLDivElement>(null);
  const prevHumanLen = useRef(human.length);
  const prevBotLen = useRef(bot.length);
  const drawNo = useRef(0);
  const [draws, setDraws] = useState<DrawFlyer[]>([]);

  // Ordre de distribution : moi, le bot, en alternance, puis la défausse.
  const order = new Map<string, number>();
  let k = 0;
  const maxLen = Math.max(human.length, bot.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < human.length) order.set("p" + human[i].id, k++);
    if (i < bot.length) order.set("b" + bot[i].id, k++);
  }
  order.set("discard", k);

  // Position de la pioche (mesurée une fois) = point de regroupement.
  useLayoutEffect(() => {
    const r = drawRef.current?.getBoundingClientRect();
    if (r) setDeck({ x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width });
    const id = requestAnimationFrame(() => setGathered(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Enchaînement des phases (une seule fois).
  useEffect(() => {
    const t1 = setTimeout(() => setAnim("deal"), GATHER_END);
    const t2 = setTimeout(() => setAnim("flip"), dealEnd);
    const t3 = setTimeout(() => setAnim("play"), dealEnd + FLIP_END);
    return () => [t1, t2, t3].forEach(clearTimeout);
  }, [dealEnd]);

  // Détecte une carte posée et la fait voler depuis sa main jusqu'à la défausse.
  useLayoutEffect(() => {
    const len = state.discard.length;
    const grew = anim === "play" && len === prevLen.current + 1;
    prevLen.current = len;
    if (!grew) {
      setDisplayedTop(top);
      playOrigin.current = null;
      return;
    }
    const dEl = discardRef.current;
    if (!dEl) {
      setDisplayedTop(top);
      return;
    }
    const d = dEl.getBoundingClientRect();
    const dcx = d.left + d.width / 2;
    const dcy = d.top + d.height / 2;
    let ocx = dcx;
    let ocy = dcy - d.height * 2;
    const o = playOrigin.current;
    if (o) {
      ocx = o.left + o.width / 2;
      ocy = o.top + o.height / 2;
    } else {
      const b = botHandRef.current?.getBoundingClientRect();
      if (b) {
        ocx = b.left + b.width / 2;
        ocy = b.top + b.height / 2;
      }
    }
    playOrigin.current = null;
    flyN.current += 1;
    setFly({ src: top.asset, x: d.left, y: d.top, w: d.width, h: d.height, fx: ocx - dcx, fy: ocy - dcy, n: flyN.current });
    const id = setTimeout(() => {
      setDisplayedTop(top);
      setFly(null);
    }, PLAY_FLIGHT);
    return () => clearTimeout(id);
  }, [state.discard, anim, top]);

  // Détecte les cartes piochées et les fait sortir de la pioche vers la main.
  useLayoutEffect(() => {
    if (anim !== "play") {
      prevHumanLen.current = human.length;
      prevBotLen.current = bot.length;
      return;
    }
    const hGrow = human.length - prevHumanLen.current;
    const bGrow = bot.length - prevBotLen.current;
    prevHumanLen.current = human.length;
    prevBotLen.current = bot.length;
    if (hGrow <= 0 && bGrow <= 0) return;
    const pile = drawRef.current?.getBoundingClientRect();
    if (!pile) return;
    const pcx = pile.left + pile.width / 2;
    const pcy = pile.top + pile.height / 2;
    const made: DrawFlyer[] = [];
    const spawn = (count: number, target: DOMRect | undefined, w: number, h: number) => {
      if (count <= 0 || !target) return;
      const cx0 = target.left + target.width / 2;
      const tcy = target.top + target.height / 2;
      for (let i = 0; i < count; i++) {
        // Étale les cartes d'un +2/+4 sur la largeur de la main.
        const tcx = cx0 + (i - (count - 1) / 2) * (w * 0.55);
        drawNo.current += 1;
        made.push({ n: drawNo.current, x: tcx - w / 2, y: tcy - h / 2, w, h, fx: pcx - tcx, fy: pcy - tcy, delay: i * 130 });
      }
    };
    spawn(hGrow, playerHandRef.current?.getBoundingClientRect(), pile.width, pile.height);
    spawn(bGrow, botHandRef.current?.getBoundingClientRect(), pile.width * 0.72, pile.height * 0.72);
    if (!made.length) return;
    setDraws((d) => [...d, ...made]);
    const maxDelay = (Math.max(hGrow, bGrow, 1) - 1) * 130;
    const id = setTimeout(() => {
      const ns = new Set(made.map((m) => m.n));
      setDraws((d) => d.filter((f) => !ns.has(f.n)));
    }, 560 + maxDelay);
    return () => clearTimeout(id);
  }, [human.length, bot.length, anim]);

  const myTurn = anim === "play" && state.current === "human" && state.status === "playing";
  const beforeFlip = anim === "gather" || anim === "deal";
  const dealWrap = anim === "deal" ? "deal-wrap deal-in" : "deal-wrap";

  return (
    <div className="uno-board" data-anim={anim}>
      <div className="felt" />

      {/* Regroupement : les cartes du "404" rejoignent la pioche */}
      {anim === "gather" &&
        captured.map((c, i) => {
          const move =
            gathered && deck
              ? `translate(${deck.x - (c.x + c.w / 2)}px, ${deck.y - (c.y + c.h / 2)}px) scale(${deck.w / c.w}) rotate(${(i % 2 ? 1 : -1) * (4 + (i % 4))}deg)`
              : "none";
          return (
            <img
              key={i}
              className="gather-clone"
              src={c.src}
              alt=""
              style={{ left: c.x, top: c.y, width: c.w, height: c.h, transform: move }}
            />
          );
        })}

      {/* Carte en cours de pose qui vole vers la défausse */}
      {fly && (
        <img
          key={fly.n}
          className="play-fly"
          src={fly.src}
          alt=""
          style={{ left: fly.x, top: fly.y, width: fly.w, height: fly.h, "--fx": `${fly.fx}px`, "--fy": `${fly.fy}px` } as CSSProperties}
        />
      )}

      {/* Cartes qui sortent de la pioche vers une main (pioche, +2, +4) */}
      {draws.map((f) => (
        <div
          key={f.n}
          className="draw-fly"
          style={{ left: f.x, top: f.y, width: f.w, height: f.h, "--fx": `${f.fx}px`, "--fy": `${f.fy}px`, animationDelay: `${f.delay}ms` } as CSSProperties}
        >
          <CardBack />
        </div>
      ))}

      <div className="board-content">
        {/* Main du bot */}
        <div className="hand bot-hand" ref={botHandRef}>
          {bot.map((c, i) => (
            <div
              key={c.id}
              className={dealWrap}
              style={{ marginLeft: i ? "-22px" : 0, "--di": `${order.get("b" + c.id) ?? 0}` } as CSSProperties}
            >
              <CardBack />
            </div>
          ))}
        </div>

        {/* Centre : pioche + défausse */}
        <div className="table-center">
          <button
            className="draw-pile"
            type="button"
            ref={drawRef}
            onClick={() => dispatch({ kind: "draw" })}
            disabled={!myTurn || !!state.justDrew}
            title="Piocher"
          >
            <CardBack className="stack stack2" />
            <CardBack className="stack stack1" />
            <CardBack className="pile-top" />
            <span className="pile-count">{state.drawPile.length}</span>
          </button>

          <div
            className={dealWrap}
            style={{ "--di": `${order.get("discard") ?? 0}` } as CSSProperties}
          >
            <div className={`discard color-${state.color}`} ref={discardRef}>
              <CardView card={displayedTop} />
              <span className={`color-badge bg-${state.color}`}>{colorName(state.color)}</span>
            </div>
          </div>
        </div>

        {/* Bandeau d'info */}
        <div className="status-bar">
          <span className={`turn-pill ${myTurn ? "mine" : ""}`}>
            {state.status === "over"
              ? "Partie terminée"
              : myTurn
                ? "À toi de jouer"
                : "Le bot réfléchit…"}
          </span>
          <span className="status-msg">{state.message}</span>
        </div>

        {/* Ma main */}
        <div className="hand player-hand" ref={playerHandRef}>
          {human.map((c, i) => {
            const off = i - mid;
            const di = order.get("p" + c.id) ?? 0;
            const can =
              myTurn &&
              isPlayable(c, state.color, top) &&
              (!state.justDrew || state.justDrew === c.id);
            const wrapCls =
              anim === "deal"
                ? "deal-wrap deal-in"
                : anim === "flip"
                  ? "deal-wrap flip-in"
                  : "deal-wrap";
            return (
              <div
                className="slot"
                key={c.id}
                ref={(el) => {
                  if (el) slotRefs.current.set(c.id, el);
                  else slotRefs.current.delete(c.id);
                }}
                style={{ "--rot": `${off * 4}deg`, "--lift": `${Math.abs(off) * 7}px`, zIndex: i } as CSSProperties}
              >
                <div className={wrapCls} style={{ "--di": `${di}` } as CSSProperties}>
                  {beforeFlip ? (
                    <CardBack />
                  ) : (
                    <CardView
                      card={c}
                      playable={can}
                      dim={myTurn && !can}
                      onClick={
                        can
                          ? () => {
                              const el = slotRefs.current.get(c.id);
                              if (el) playOrigin.current = el.getBoundingClientRect();
                              dispatch({ kind: "play", cardId: c.id });
                            }
                          : undefined
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="actions">
          {state.justDrew && (
            <button className="btn pass" type="button" onClick={() => dispatch({ kind: "pass" })}>
              Passer
            </button>
          )}
          {state.unoPending && (
            <button className="btn uno-call" type="button" onClick={() => dispatch({ kind: "callUno" })}>
              UNO !
            </button>
          )}
        </div>
      </div>

      {/* Choix de couleur après un joker */}
      {state.status === "choosingColor" && (
        <div className="overlay">
          <div className="panel">
            <p className="panel-title">Choisis une couleur</p>
            <div className="color-row">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-choice bg-${c}`}
                  onClick={() => dispatch({ kind: "color", color: c })}
                >
                  {colorName(c)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Fin de partie */}
      {state.status === "over" && (
        <div className="overlay">
          <div className="panel">
            <h2 className="result-title">
              {state.winner === "human" ? "Tu as gagné !" : "Le bot gagne"}
            </h2>
            <div className="result-actions">
              <button className="btn" type="button" onClick={() => dispatch({ kind: "restart" })}>
                Rejouer
              </button>
              <button className="btn ghost" type="button" onClick={onExit}>
                Retour au 404
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
