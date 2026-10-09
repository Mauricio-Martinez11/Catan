import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  Timer,
  Check,
  Dices,
} from "lucide-react";
import { COLORS, NAMES, RESOURCES, emptyHand } from "./game/types";
import type { Hand, Resource } from "./game/types";
import type { PublicGame, Snapshot } from "./network";
import { COSTS, canPay, sum } from "./game/engine";
import { ResourceList } from "./components";
import { PieceIcon } from "./GameArt";

export function CostCards({
  cost,
  hand,
  concealed = false,
}: {
  cost: Hand;
  hand?: Hand;
  concealed?: boolean;
}) {
  return (
    <span className="cost-cards">
      {RESOURCES.flatMap((r) =>
        Array.from({ length: cost[r] }, (_, i) => (
          <span
            key={`${r}-${i}`}
            className={`mini-resource ${!concealed && hand && hand[r] <= i ? "missing" : ""}`}
            title={`${NAMES[r]}${!concealed && hand ? (hand[r] > i ? ": disponible" : ": te falta") : ""}`}
          >
            <img src={`/art/${r}.webp`} alt={NAMES[r]} />
            {!concealed && hand && <i>{hand[r] > i ? "✓" : "−"}</i>}
          </span>
        )),
      )}
    </span>
  );
}

export function ResourceCard({
  resource,
  count,
  gain,
  hidden,
}: {
  resource: Resource;
  count: number;
  gain: number;
  hidden: boolean;
}) {
  return (
    <div
      className={`resource-card ${!count && !hidden ? "empty" : ""} ${hidden ? "concealed" : ""}`}
      style={{ "--resource": COLORS[resource] } as React.CSSProperties}
      aria-label={
        hidden ? "Cartas ocultas" : `${NAMES[resource]}: ${count} cartas`
      }
      title={hidden ? "Cartas ocultas" : `${NAMES[resource]}: ${count}`}
    >
      {hidden ? (
        <div className="card-back">
          <span>⬡</span>
          <b>CATAN</b>
        </div>
      ) : (
        <>
          <img className="card-art" src={`/art/${resource}.webp`} alt="" />
          <strong className="card-quantity" key={count}>
            {count}
          </strong>
          {gain > 0 && <span className="card-gain" title="Recursos recibidos">+{gain}</span>}
        </>
      )}
    </div>
  );
}

export function PlayerHand({
  g,
  you,
  hidden,
  onToggle,
}: {
  g: PublicGame;
  you: number;
  hidden: boolean;
  onToggle: () => void;
}) {
  const me = g.players[you];
  const gains = g.dice
    ? (g.production?.gains[you] ?? emptyHand())
    : emptyHand();
  return (
    <section
      className="player-table"
      aria-label="Tus cartas y costes de construcción"
    >
      <div className="table-hand">
        <div className="hand-heading">
          <div>
            <span className="eyebrow">TU MANO</span>
            <h3 aria-label={`${me.resourceCount} cartas de recursos`}>{me.resourceCount}</h3>
          </div>
          <button
            className="icon-btn"
            aria-label={hidden ? "Mostrar mi mano" : "Ocultar mi mano"}
            onClick={onToggle}
          >
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <div className="resource-hand">
          {RESOURCES.map((r) => (
            <ResourceCard
              key={r}
              resource={r}
              count={me.resources[r]}
              gain={gains[r]}
              hidden={hidden}
            />
          ))}
        </div>
      </div>
      <div className="cost-sheet">
        <h3>Costes</h3>
        {(["road", "settlement", "city", "development"] as const).map(
          (type, i) => {
            const ready = canPay(me.resources, COSTS[type]);
            const label = ["Carretera", "Poblado", "Ciudad", "Desarrollo"][i];
            return (
              <div key={type} className="cost-sheet-row" title={label} aria-label={`Coste de ${label.toLowerCase()}`}>
                <PieceIcon kind={type} color={me.color} size={28} />
                <CostCards
                  cost={COSTS[type]}
                  hand={me.resources}
                  concealed={hidden}
                />
                {!hidden && (
                  <span
                    className={ready ? "cost-ready" : "cost-missing"}
                    title={ready ? "Tienes los recursos" : "Faltan recursos"}
                  >
                    {ready ? <Check size={13} /> : "−"}
                  </span>
                )}
              </div>
            );
          },
        )}
      </div>
    </section>
  );
}

export function TurnTimer({ snapshot }: { snapshot: Snapshot }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(t);
  }, []);
  const clock = snapshot.room.clock;
  if (!clock || !snapshot.game) return null;
  const serverNow = now + snapshot.serverNow - snapshot.receivedAt;
  const seconds = Math.max(0, Math.ceil((clock.deadline - serverNow) / 1000));
  const special = clock.kind === "robber" || clock.kind === "discard";
  const owner = snapshot.game.players[clock.player];
  return (
    <div
      className={`turn-timer ${seconds <= 10 ? "urgent" : ""} ${special ? "special" : ""}`}
      role="timer"
      title={
        special
          ? "Al llegar a cero se resuelve automáticamente esta decisión y se reanuda el tiempo restante del turno."
          : "Al llegar a cero se cierran las ofertas, se completan las decisiones obligatorias y pasa el turno."
      }
      aria-label={`${clock.kind === "discard" ? "Descarte" : special ? "Ladrón" : "Turno"} de ${owner.name}: ${seconds} segundos`}
    >
      <Timer size={20} />
      <div>
        <small>
          {clock.kind === "discard"
            ? "DESCARTE"
            : special
              ? "LADRÓN"
              : clock.kind === "setup"
                ? "PREPARACIÓN"
                : "TIEMPO DE TURNO"}{" "}
          · {snapshot.you === clock.player ? "TÚ" : owner.name}
        </small>
        <strong>
          {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
        </strong>
      </div>
      <div className="timer-track">
        <i
          style={{
            width: `${Math.min(100, ((seconds * 1000) / clock.duration) * 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

export function ProductionSummary({ g, you }: { g: PublicGame; you: number }) {
  const event = g.production;
  if (!event || !g.dice) return null;
  const received = g.players.filter(
    (p) => !p.neutral && sum(event.gains[p.id]) > 0,
  );
  return (
    <section
      className={`production-summary ${event.total === 7 ? "robber-result" : ""}`}
      key={event.id}
      aria-live="polite"
    >
      <div className="production-title">
        <Dices size={18} />
        <b>
          {event.total === 7
            ? "Salió 7 · entra el ladrón"
            : `Salió ${event.total} · recursos repartidos`}
        </b>
        <span>{event.total === 7 ? "No hay producción" : "AUTOMÁTICO"}</span>
      </div>
      {event.total !== 7 && (
        <div className="production-players">
          {received.length ? (
            received.map((p) => (
              <span key={p.id}>
                <i style={{ background: p.color }} />
                <b>{p.id === you ? "Tú" : p.name}</b>
                <ResourceList hand={event.gains[p.id]} />
              </span>
            ))
          ) : (
            <p>Nadie recibe recursos con esta tirada.</p>
          )}
        </div>
      )}
      {!!event.shortages.length && (
        <p>
          Reserva insuficiente:{" "}
          {event.shortages.map((r) => NAMES[r]).join(", ")}. Se aplica la regla
          de escasez.
        </p>
      )}
    </section>
  );
}
