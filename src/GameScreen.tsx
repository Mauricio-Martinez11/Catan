import { useEffect, useState } from "react";
import {
  CostCards,
  PlayerHand,
  ProductionSummary,
  TurnTimer,
} from "./TablePieces";
import {
  House,
  Route,
  Building2,
  ScrollText,
  ArrowRightLeft,
  Shield,
  Trophy,
  Dices,
  ChevronRight,
  Check,
  CircleHelp,
  Anchor,
  Clock3,
  Eye,
  EyeOff,
} from "lucide-react";
import Board from "./Board";
import { PieceIcon } from "./GameArt";
import {
  Dice,
  HandPicker,
  Modal,
  ResourceIcon,
  ResourceList,
  ResourceSelect,
} from "./components";
import {
  COSTS,
  bankRate,
  canPay,
  legalCities,
  legalRoads,
  legalSettlements,
  points,
  remaining,
  sum,
  humanCount,
  neutralOptions,
  tokenCost,
} from "./game/engine";
import { COLORS, DEV_NAMES, NAMES, RESOURCES, emptyHand } from "./game/types";
import type { Action, Hand, Resource } from "./game/types";
import type { Connection, PublicGame, Snapshot } from "./network";

type Build = "road" | "settlement" | "city" | null;
const descriptions = {
  knight: "Mueve el ladrón y roba una carta.",
  roadBuilding: "Construye hasta dos carreteras gratis.",
  plenty: "Elige dos recursos del banco.",
  monopoly: "Recibe de todos un tipo de recurso.",
  victory: "Un punto secreto. Se revela al ganar.",
};
export default function GameScreen({
  conn,
  snapshot,
}: {
  conn: Connection;
  snapshot: Snapshot;
}) {
  const { game: maybeGame, you, room } = snapshot,
    g = maybeGame!,
    me = g.players[you],
    current = g.players[g.current];
  const [build, setBuild] = useState<Build>(null),
    [panel, setPanel] = useState<"build" | "trade" | "cards">("build"),
    [panelOpen, setPanelOpen] = useState(false),
    [hide, setHide] = useState(false),
    [hideInfo, setHideInfo] = useState(false),
    [tradeOpen, setTradeOpen] = useState(false),
    [neutral, setNeutral] = useState(2),
    [devIndex, setDevIndex] = useState<number | null>(null),
    [discard, setDiscard] = useState<Hand>(emptyHand());
  const yourTurn = g.current === you,
    locked = conn.busy || !conn.connected,
    canAct = yourTurn && g.phase === "actions" && !g.trade && !locked,
    canTrade = g.phase === "actions" && !g.paired && !g.trade && !locked;
  useEffect(() => {
    setBuild(null);
    setDevIndex(null);
    setTradeOpen(false);
    setDiscard(emptyHand());
  }, [g.turn, g.phase, g.id]);
  const execute = (a: Action) => {
    if (locked) return;
    if (conn.act(a)) setBuild(null);
  };
  const neutralPlayer = neutralOptions(g, neutral).length
    ? neutral
    : ([2, 3].find((id) => neutralOptions(g, id).length) ?? 2);
  const activeBuild =
    yourTurn && !locked && !g.trade
      ? g.phase === "neutralBuild"
        ? g.duel!.neutralBuild!.kind
        : g.phase === "setupSettlement"
          ? "settlement"
          : g.phase === "setupRoad" || g.phase === "freeRoads"
            ? "road"
            : g.phase === "actions"
              ? build
              : null
      : null;
  const legalV =
    activeBuild === "settlement"
      ? g.phase === "neutralBuild"
        ? neutralOptions(g, neutralPlayer)
        : legalSettlements(g)
      : activeBuild === "city"
        ? legalCities(g)
        : [];
  const legalE =
    activeBuild === "road"
      ? g.phase === "neutralBuild"
        ? neutralOptions(g, neutralPlayer)
        : legalRoads(g)
      : [];
  const supply = remaining(g, you),
    isSetup = g.phase.startsWith("setup");
  const phaseText =
    g.phase === "neutralBuild"
      ? `Coloca ${g.duel!.neutralBuild!.kind === "road" ? "una carretera" : "un poblado"} neutral`
      : g.phase === "forcedTrade"
        ? "Devuelve dos recursos a tu rival"
        : g.phase === "setupSettlement"
          ? "Elige dónde fundar tu poblado"
          : g.phase === "setupRoad"
            ? "Conecta tu poblado con una carretera"
            : g.phase === "roll"
              ? g.duel
                ? `Tirada ${g.duel.rolls.length + 1} de 2 · partida de dos`
                : "Todo comienza con los dados"
              : g.phase === "discard"
                ? `${g.players[g.discardQueue[0]].name} debe descartar`
                : g.phase === "robber"
                  ? "Mueve el ladrón a otro territorio"
                  : g.phase === "steal"
                    ? "Elige a quién robar"
                    : g.phase === "freeRoads"
                      ? `Construye ${g.freeRoads} carretera${g.freeRoads === 1 ? "" : "s"} gratis`
                      : g.phase === "finished"
                        ? "Una isla, una gran historia"
                        : g.trade
                          ? "Hay un intercambio sobre la mesa"
                          : activeBuild
                            ? `Elige una posición para ${activeBuild === "road" ? "tu carretera" : activeBuild === "city" ? "tu ciudad" : "tu poblado"}`
                            : "Construye, intercambia, haz tu jugada";
  const hint =
    g.phase === "neutralBuild"
      ? "Elige un color neutral y toca una posición marcada en el tablero."
      : g.phase === "forcedTrade"
        ? "Puedes devolver incluso los recursos que acabas de recibir."
        : isSetup
          ? "Los puntos y líneas claros muestran posiciones válidas."
          : g.paired
            ? "Turno de pareja: banco, construcción y una carta de desarrollo."
            : g.phase === "roll"
              ? "También puedes jugar una carta de desarrollo antes de lanzar."
              : g.phase === "robber"
                ? "Toca un hexágono. El ladrón bloquea su producción."
                : g.phase === "actions"
                  ? "Puedes alternar comercio y construcción en este turno."
                  : "La mesa espera a que se complete esta acción.";
  return (
    <main className={`game-page panel-${panel}${panelOpen ? " mobile-panel-open" : ""}${hideInfo ? " info-hidden" : ""}`}>
      <div className="game-layout">
        <section className="game-board">
          <div className="turn-bar">
            <div>
              <div className="eyebrow">
                <span
                  className="live-dot"
                  style={{ background: current.color }}
                />
                {g.phase === "finished"
                  ? "PARTIDA TERMINADA"
                  : isSetup
                    ? `PREPARACIÓN · VUELTA ${g.setupStep < humanCount(g) ? 1 : 2} DE 2`
                    : `TURNO ${g.round}${g.paired ? " · PAREJA" : ""}`}
                <span className="tag turn-owner">
                  {yourTurn ? "TU TURNO" : current.name}
                </span>
              </div>
              <h2>{phaseText}</h2>
              <p>
                {yourTurn || g.phase === "discard" || g.phase === "finished"
                  ? hint
                  : `Es el turno de ${current.name}. Puedes consultar tu mano y las reglas.`}
              </p>
            </div>
            <div className="turn-controls">
              <TurnTimer snapshot={snapshot} />
              <div className="dice-area" key={g.production?.id ?? 0}>
                {g.dice ? (
                  <>
                    <Dice value={g.dice[0]} />
                    <Dice value={g.dice[1]} />
                    <span className="dice-total">{g.dice[0] + g.dice[1]}</span>
                  </>
                ) : (
                  <>
                    <Dice value={1} />
                    <Dice value={1} />
                  </>
                )}
              </div>
              {g.phase === "roll" && yourTurn && (
                <button
                  className="primary roll-button"
                  disabled={locked}
                  onClick={() => execute({ type: "roll" })}
                >
                  <Dices size={20} />
                  {g.duel
                    ? `Lanzar · tirada ${g.duel.rolls.length + 1} de 2`
                    : "Lanzar los dados"}
                </button>
              )}
            </div>
          </div>
          {g.duel && (
            <div className="neutral-strip">
              <span>COLORES NEUTRALES</span>
              {[2, 3].map((id) => (
                <button
                  key={id}
                  className={
                    g.phase === "neutralBuild" && neutralPlayer === id
                      ? "selected"
                      : ""
                  }
                  disabled={
                    !yourTurn ||
                    g.phase !== "neutralBuild" ||
                    locked ||
                    !neutralOptions(g, id).length
                  }
                  aria-pressed={
                    g.phase === "neutralBuild" && neutralPlayer === id
                  }
                  onClick={() => setNeutral(id)}
                >
                  <i style={{ background: g.players[id].color }} />
                  {g.players[id].name}{" "}
                  <small>{g.roadLengths[id]} carreteras de ruta</small>
                </button>
              ))}
              {g.duel.rolls.length > 0 && (
                <small>Tiradas: {g.duel.rolls.join(" · ")}</small>
              )}
              <p className="neutral-explanation">
                Las casas amarillas y moradas son neutrales de CATAN para dos:
                no son jugadores y no reciben recursos. Ambos construís para ellas.
              </p>
            </div>
          )}
          <Board
            board={g.board}
            game={g}
            legalVertices={legalV}
            legalEdges={legalE}
            onVertex={(id) => {
              if (g.phase === "neutralBuild" && activeBuild === "settlement") {
                execute({ type: "neutralBuild", player: neutralPlayer, id });
                return;
              }
              if (activeBuild === "settlement" || activeBuild === "city")
                execute({ type: activeBuild, id });
            }}
            onEdge={(id) => {
              if (g.phase === "neutralBuild" && activeBuild === "road") {
                execute({ type: "neutralBuild", player: neutralPlayer, id });
                return;
              }
              if (activeBuild === "road") execute({ type: "road", id });
            }}
            onTile={(tile) => {
              if (yourTurn && g.phase === "robber" && !locked)
                execute({ type: "robber", tile });
            }}
          />
          <div className="board-bottom">
            <div className="legend">
              {RESOURCES.map((r) => (
                <span key={r}>
                  <i style={{ background: COLORS[r] }} />
                  {NAMES[r]}
                </span>
              ))}
            </div>
            {build && (
              <button className="quiet" onClick={() => setBuild(null)}>
                Cancelar construcción
              </button>
            )}
            <span className="tag">
              {g.duel
                ? "2 jugadores · CATAN para dos"
                : g.players.length > 6
                  ? "Variante casera"
                  : "Reglas base"}{" "}
              · {g.board.tiles.length} terrenos
            </span>
          </div>
          <nav className="action-dock" aria-label="Acciones rápidas">
            <button className={panel === "build" && panelOpen ? "active" : ""} onClick={() => { setPanel("build"); setPanelOpen((open) => panel === "build" ? !open : true); }} title="Construir">
              <Building2 size={20} /><span>Construir</span>
            </button>
            <button className={panel === "trade" && panelOpen ? "active" : ""} onClick={() => { setPanel("trade"); setPanelOpen((open) => panel === "trade" ? !open : true); }} title="Comerciar">
              <ArrowRightLeft size={20} /><span>Comerciar</span>
            </button>
            <button className={panel === "cards" && panelOpen ? "active" : ""} onClick={() => { setPanel("cards"); setPanelOpen((open) => panel === "cards" ? !open : true); }} title="Cartas de desarrollo">
              <ScrollText size={20} /><span>Desarrollo</span>
              {me.devCount > 0 && <b>{me.devCount}</b>}
            </button>
            <button onClick={() => setHide(!hide)} title={hide ? "Mostrar cartas" : "Ocultar cartas"}>
              {hide ? <EyeOff size={20} /> : <Eye size={20} />}<span>Mano</span>
            </button>
          </nav>
          <ProductionSummary g={g} you={you} />
          <PlayerHand
            g={g}
            you={you}
            hidden={hide}
            onToggle={() => setHide(!hide)}
          />
          <div className="awards">
            <div>
              <Route size={23} />
              <p>
                <b>
                  Mayor ruta comercial <em>+2 PV</em>
                </b>
                <span>
                  {g.longest === null
                    ? "En juego · mínimo 5 carreteras"
                    : `${g.players[g.longest].name} · ${g.roadLengths[g.longest]} carreteras`}
                </span>
              </p>
              <span className="personal-stat">
                Tu ruta: {g.roadLengths[you]}
              </span>
            </div>
            <div>
              <Shield size={23} />
              <p>
                <b>
                  Mayor ejército <em>+2 PV</em>
                </b>
                <span>
                  {g.army === null
                    ? "En juego · mínimo 3 caballeros"
                    : `${g.players[g.army].name} · ${g.players[g.army].knights} caballeros`}
                </span>
              </p>
              <span className="personal-stat">Los tuyos: {me.knights}</span>
            </div>
          </div>
          <details className="history">
            <summary>
              <Clock3 size={15} /> Historia de la partida{" "}
              <span>{g.log[0]}</span>
            </summary>
            <ol>
              {g.log.map((line, i) => (
                <li key={`${i}-${line}`}>{line}</li>
              ))}
            </ol>
          </details>
        </section>
        <aside className="game-sidebar">
          <section className="player-roster" aria-label="Jugadores y puntuaciones">
            <button
              className="info-toggle"
              aria-label={hideInfo ? "Mostrar información de jugadores" : "Ocultar información de jugadores"}
              title={hideInfo ? "Mostrar jugadores" : "Ocultar jugadores"}
              onClick={() => setHideInfo((value) => !value)}
            >
              {hideInfo ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
            {g.players
              .filter((p) => !p.neutral)
              .map((p) => (
                <div
                  key={p.id}
                  className={`score-player ${p.id === g.current ? "current" : ""} ${p.id === you ? "self" : ""}`}
                  style={{ "--player": p.color } as React.CSSProperties}
                >
                  <span className="avatar" style={{ background: p.color }}>
                    {p.name[0].toUpperCase()}
                    <i className={room.seats[p.id]?.online ? "online" : "offline"} />
                  </span>
                  <div className="score-name">
                    <b>{p.name}{p.id === you ? " · tú" : ""}</b>
                    <small className="score-icons" aria-label="Piezas y cartas">
                      <span title="Cartas de recursos">▤ {p.resourceCount}</span>
                      <span title="Cartas de desarrollo">▥ {p.devCount}</span>
                      {g.duel && <span title="Fichas de comercio">◈ {g.duel.tokens[p.id]}</span>}
                      <span className="piece-count" title="Carreteras"><PieceIcon kind="road" color={p.color} size={16} /> {g.roadLengths[p.id]}</span>
                      <span className="piece-count" title="Poblados"><PieceIcon kind="settlement" color={p.color} size={16} /> {g.board.vertices.filter((v) => v.building?.owner === p.id && !v.building.city).length}</span>
                      <span className="piece-count" title="Ciudades"><PieceIcon kind="city" color={p.color} size={16} /> {g.board.vertices.filter((v) => v.building?.owner === p.id && v.building.city).length}</span>
                    </small>
                  </div>
                  <div className="score-points">
                    {points(g, p.id, p.id === you || g.phase === "finished")}
                    <small>PV</small>
                  </div>
                </div>
              ))}
          </section>
          {g.phase === "finished" ? (
            <section className="winner-panel">
              <Trophy size={45} />
              <div className="eyebrow">LA VICTORIA ES PARA</div>
              <h2>{g.players[g.winner!].name}</h2>
              <p>{points(g, g.winner!)} puntos de victoria</p>
              <div className="final-scores">
                {[...g.players]
                  .filter((p) => !p.neutral)
                  .sort((a, b) => points(g, b.id) - points(g, a.id))
                  .map((p) => (
                    <div key={p.id}>
                      <span>{p.name}</span>
                      <b>{points(g, p.id)} PV</b>
                    </div>
                  ))}
              </div>
              {you === room.host && (
                <button
                  className="primary"
                  disabled={locked}
                  onClick={() => conn.send({ type: "rematch" })}
                >
                  Preparar otra isla <ChevronRight size={17} />
                </button>
              )}
            </section>
          ) : (
            <>
              {g.duel && (
                <section className="duel-panel">
                  <div className="panel-title">
                    <h3>Fichas de comercio</h3>
                    <b className="token-count">◈ {g.duel.tokens[you]}</b>
                  </div>
                  <p>
                    Una acción por turno · coste {tokenCost(g, you)} ficha
                    {tokenCost(g, you) === 1 ? "" : "s"}. Reserva:{" "}
                    {g.duel.supply}.
                  </p>
                  <div className="duel-actions">
                    <button
                      className="secondary"
                      disabled={
                        locked ||
                        !yourTurn ||
                        !!g.trade ||
                        !["roll", "actions"].includes(g.phase) ||
                        g.duel.spent ||
                        g.duel.tokens[you] < tokenCost(g, you) ||
                        g.players[1 - you].resourceCount === 0 ||
                        me.resourceCount +
                          Math.min(2, g.players[1 - you].resourceCount) <
                          2
                      }
                      onClick={() => execute({ type: "forceTrade" })}
                    >
                      Forzar intercambio
                    </button>
                    <button
                      className="secondary"
                      disabled={
                        locked ||
                        !yourTurn ||
                        !!g.trade ||
                        !["roll", "actions"].includes(g.phase) ||
                        g.duel.spent ||
                        g.duel.tokens[you] < tokenCost(g, you) ||
                        g.board.tiles[g.robber].resource === "desert"
                      }
                      onClick={() => execute({ type: "chaseRobber" })}
                    >
                      Expulsar al ladrón
                    </button>
                    <button
                      className="quiet"
                      disabled={
                        locked ||
                        !yourTurn ||
                        !!g.trade ||
                        !["roll", "actions"].includes(g.phase) ||
                        g.duel.retiredKnight ||
                        !me.knights ||
                        !g.duel.supply
                      }
                      onClick={() => execute({ type: "retireKnight" })}
                    >
                      Retirar un caballero · +{Math.min(2, g.duel.supply)}{" "}
                      fichas
                    </button>
                  </div>
                  {g.duel.spent && (
                    <small>Ya has gastado fichas este turno.</small>
                  )}
                </section>
              )}
              {g.phase === "forcedTrade" && yourTurn && (
                <section className="action-card">
                  <h3>Completa el comercio forzado</h3>
                  <p>
                    Ya recibiste las cartas al azar. Elige dos para tu rival.
                  </p>
                  <HandPicker
                    value={discard}
                    onChange={setDiscard}
                    max={me.resources}
                    label="Devolver"
                  />
                  <button
                    className="primary"
                    disabled={locked || sum(discard) !== 2}
                    onClick={() =>
                      execute({ type: "returnTrade", resources: discard })
                    }
                  >
                    Devolver {sum(discard)} / 2
                  </button>
                </section>
              )}
              {g.phase === "discard" && g.discardQueue[0] === you && (
                <section className="action-card">
                  <h3>El ladrón reclama su parte</h3>
                  <p>
                    Tienes {me.resourceCount} cartas. Elige exactamente{" "}
                    {Math.floor(me.resourceCount / 2)} para devolver al banco.
                  </p>
                  <HandPicker
                    value={discard}
                    onChange={setDiscard}
                    max={me.resources}
                    label="Descartar"
                  />
                  <button
                    className="primary"
                    disabled={
                      locked ||
                      sum(discard) !== Math.floor(me.resourceCount / 2)
                    }
                    onClick={() =>
                      execute({ type: "discard", resources: discard })
                    }
                  >
                    Descartar {sum(discard)} /{" "}
                    {Math.floor(me.resourceCount / 2)}
                  </button>
                </section>
              )}
              {g.phase === "steal" && yourTurn && (
                <section className="action-card">
                  <h3>¿A quién robas?</h3>
                  <p>Recibirás una carta al azar.</p>
                  {g.players
                    .filter(
                      (p) =>
                        p.id !== you &&
                        !p.neutral &&
                        g.board.tiles[g.robber].vertices.some(
                          (id) => g.board.vertices[id].building?.owner === p.id,
                        ),
                    )
                    .map((p) => (
                      <button
                        key={p.id}
                        className="victim-btn"
                        disabled={locked}
                        onClick={() => execute({ type: "steal", player: p.id })}
                      >
                        <span
                          className="avatar"
                          style={{ background: p.color }}
                        >
                          {p.name[0]}
                        </span>
                        {p.name}
                        <span>{p.resourceCount} cartas</span>
                      </button>
                    ))}
                </section>
              )}
              {g.trade && (g.trade.with === you || yourTurn) && (
                <section className="action-card trade-incoming">
                  <h3>
                    {g.trade.proposer === you
                      ? "Esperando respuesta"
                      : `${g.players[g.trade.proposer].name} propone un trato`}
                  </h3>
                  <p>
                    {g.trade.proposer === you
                      ? `Oferta enviada a ${g.players[yourTurn ? g.trade.with : g.current].name}.`
                      : "Comprueba los recursos antes de aceptar."}
                  </p>
                  <div className="trade-summary">
                    <span>
                      {yourTurn ? "Entregas" : "Recibes"}
                      <ResourceList hand={g.trade.give} />
                    </span>
                    <ArrowRightLeft size={18} />
                    <span>
                      {yourTurn ? "Recibes" : "Entregas"}
                      <ResourceList hand={g.trade.receive} />
                    </span>
                  </div>
                  {g.trade.proposer !== you && (
                    <button
                      className="primary"
                      disabled={
                        locked ||
                        !canPay(
                          me.resources,
                          yourTurn ? g.trade.give : g.trade.receive,
                        )
                      }
                      onClick={() =>
                        execute({ type: "acceptTrade", player: you })
                      }
                    >
                      Aceptar intercambio <Check size={16} />
                    </button>
                  )}
                  <button
                    className="secondary full"
                    disabled={locked}
                    onClick={() => execute({ type: "declineTrade" })}
                  >
                    {g.trade.proposer === you
                      ? "Retirar oferta"
                      : "Rechazar oferta"}
                  </button>
                </section>
              )}
              {(isSetup ||
                ["robber", "freeRoads", "discard", "neutralBuild"].includes(
                  g.phase,
                ) ||
                (!yourTurn && !g.trade)) && (
                <div className="phase-help">
                  <CircleHelp size={20} />
                  <div>
                    <b>
                      {yourTurn
                        ? "Tu siguiente paso"
                        : `Turno de ${current.name}`}
                    </b>
                    <p>
                      {yourTurn
                        ? phaseText
                        : "La partida se actualizará automáticamente en tu pantalla."}
                    </p>
                  </div>
                </div>
              )}
              <section className="action-panel">
                <div className="action-tabs">
                  {(["build", "trade", "cards"] as const).map((tab, i) => (
                    <button
                      className={panel === tab ? "active" : ""}
                      key={tab}
                      onClick={() => setPanel(tab)}
                    >
                      <span className="tab-icon">
                        {[<Building2 size={19} />, <ArrowRightLeft size={19} />, <ScrollText size={19} />][i]}
                      </span>
                      <span className="tab-label">{["Construir", "Comerciar", "Desarrollo"][i]}</span>
                      {tab === "cards" && me.devCount > 0 && (
                        <span>{me.devCount}</span>
                      )}
                    </button>
                  ))}
                </div>
                {panel === "build" && (
                  <div className="build-list">
                    {(
                      ["road", "settlement", "city", "development"] as const
                    ).map((type, i) => {
                      const available =
                          type === "development" ? g.deckCount : supply[type],
                        locations =
                          type === "road"
                            ? legalRoads(g, you, false)
                            : type === "settlement"
                              ? legalSettlements(g, you, false)
                              : type === "city"
                                ? legalCities(g, you)
                                : [0],
                        affordable = canPay(me.resources, COSTS[type]);
                      return (
                        <button
                          key={type}
                          className={`build-option ${build === type ? "selected" : ""}`}
                          disabled={
                            !canAct ||
                            !affordable ||
                            !available ||
                            !locations.length
                          }
                          onClick={() =>
                            type === "development"
                              ? execute({ type: "buyDev" })
                              : setBuild(build === type ? null : type)
                          }
                          title={
                            !affordable
                              ? "Te faltan recursos"
                              : !locations.length
                                ? "No hay posiciones válidas"
                                : `${available} disponibles`
                          }
                        >
                          <span className="build-icon">
                            <PieceIcon kind={type === "development" ? "development" : type} color={me.color} size={39} />
                          </span>
                          <span className="build-description">
                            <b>
                              {
                                [
                                  "Carretera",
                                  "Poblado",
                                  "Ciudad",
                                  "Desarrollo",
                                ][i]
                              }
                              <small>
                                {type === "development"
                                  ? `${available} en el mazo`
                                  : `${available} disponibles`}
                              </small>
                            </b>
                            <CostCards
                              cost={COSTS[type]}
                              hand={me.resources}
                              concealed={hide}
                            />
                          </span>
                          <ChevronRight size={15} />
                        </button>
                      );
                    })}
                    {!yourTurn && (
                      <p className="panel-footnote">
                        Podrás construir cuando llegue tu turno.
                      </p>
                    )}
                  </div>
                )}
                {panel === "trade" && (
                  <Commerce
                    g={g}
                    you={you}
                    enabled={canAct}
                    playerEnabled={canTrade}
                    onAction={execute}
                    onPlayerTrade={() => setTradeOpen(true)}
                  />
                )}
                {panel === "cards" && (
                  <div className="development-list">
                    {hide ? (
                      <p className="empty-note">
                        Tu mano está oculta. Pulsa el ojo para mostrarla.
                      </p>
                    ) : me.dev.length === 0 ? (
                      <div className="empty-note">
                        <ScrollText size={32} />
                        <b>Tu próxima ventaja</b>
                        <p>
                          Compra una carta de desarrollo con lana, cereal y
                          mineral.
                        </p>
                      </div>
                    ) : (
                      me.dev.map((card, index) => (
                        <div
                          className={`dev-card ${card.kind === "victory" ? "victory" : ""}`}
                          key={`${index}-${card.bought}`}
                        >
                          <div>
                            <b>{DEV_NAMES[card.kind]}</b>
                            <p>{descriptions[card.kind]}</p>
                          </div>
                          {card.kind === "victory" ? (
                            <span className="vp-secret">+1 PV</span>
                          ) : (
                            <button
                              className="secondary"
                              disabled={
                                locked ||
                                !yourTurn ||
                                !!g.trade ||
                                !["roll", "actions"].includes(g.phase) ||
                                g.playedDev ||
                                card.bought >= g.turn
                              }
                              onClick={() => {
                                if (
                                  card.kind === "plenty" ||
                                  card.kind === "monopoly"
                                )
                                  setDevIndex(index);
                                else execute({ type: "playDev", index });
                              }}
                            >
                              {card.bought >= g.turn
                                ? "Próximo turno"
                                : "Jugar"}
                            </button>
                          )}
                        </div>
                      ))
                    )}
                    <p className="panel-footnote">
                      Una carta por turno. Los puntos de victoria son secretos.
                    </p>
                  </div>
                )}
              </section>
              {yourTurn && g.phase === "actions" && (
                <button
                  className="primary end-button"
                  disabled={!canAct}
                  onClick={() => execute({ type: "end" })}
                >
                  Terminar mi turno <ChevronRight size={18} />
                </button>
              )}
            </>
          )}
          <section className="bank-panel">
            <div className="section-label">
              <Anchor size={16} /> Reserva del banco
            </div>
            <div className="bank-resources">
              {RESOURCES.map((r) => (
                <span key={r} title={NAMES[r]}>
                  <ResourceIcon resource={r} />
                  <b>{g.bank[r]}</b>
                </span>
              ))}
            </div>
          </section>
        </aside>
      </div>
      {tradeOpen && (
        <PlayerTrade
          g={g}
          you={you}
          onClose={() => setTradeOpen(false)}
          onOffer={(a) => {
            execute(a);
            setTradeOpen(false);
          }}
        />
      )}
      {devIndex !== null && me.dev[devIndex] && (
        <DevelopmentDialog
          g={g}
          index={devIndex}
          onClose={() => setDevIndex(null)}
          onPlay={(a) => {
            execute(a);
            setDevIndex(null);
          }}
        />
      )}
    </main>
  );
}
function Commerce({
  g,
  you,
  enabled,
  playerEnabled,
  onAction,
  onPlayerTrade,
}: {
  g: PublicGame;
  you: number;
  enabled: boolean;
  playerEnabled: boolean;
  onAction: (a: Action) => void;
  onPlayerTrade: () => void;
}) {
  const [give, setGive] = useState<Resource>("wood"),
    [receive, setReceive] = useState<Resource>("brick"),
    [quantity, setQuantity] = useState(1);
  const rate = bankRate(g, you, give),
    valid =
      give !== receive &&
      g.players[you].resources[give] >= rate * quantity &&
      g.bank[receive] >= quantity;
  return (
    <div className="commerce">
      <div className="trade-selects">
        <ResourceSelect label="Entregas" value={give} onChange={setGive} />
        <ArrowRightLeft size={17} />
        <ResourceSelect label="Recibes" value={receive} onChange={setReceive} />
      </div>
      <label className="quantity">
        Cantidad a recibir
        <input
          type="number"
          min="1"
          max="20"
          value={quantity}
          onChange={(e) =>
            setQuantity(
              Math.max(
                1,
                Math.min(20, Math.floor(Number(e.target.value) || 1)),
              ),
            )
          }
        />
      </label>
      <div className="exchange-rate">
        <Anchor size={16} />
        {rate}:1 ·{" "}
        {rate === 4
          ? "Banco"
          : rate === 3
            ? "Puerto general"
            : "Puerto especializado"}
        <b>
          {rate * quantity} → {quantity}
        </b>
      </div>
      <button
        className="primary full"
        disabled={!enabled || !valid}
        onClick={() => onAction({ type: "bank", give, receive, quantity })}
      >
        Intercambiar con el banco
      </button>
      <div className="divider">O NEGOCIA CON LA MESA</div>
      <button
        className="secondary full"
        disabled={!playerEnabled}
        onClick={onPlayerTrade}
      >
        <ArrowRightLeft size={16} /> Proponer un intercambio
      </button>
      {g.paired && (
        <p className="panel-footnote">
          La pareja solo puede comerciar con el banco.
        </p>
      )}
    </div>
  );
}
function PlayerTrade({
  g,
  you,
  onClose,
  onOffer,
}: {
  g: PublicGame;
  you: number;
  onClose: () => void;
  onOffer: (a: Action) => void;
}) {
  const [withPlayer, setWith] = useState(
      you === g.current
        ? g.players.find((p) => p.id !== you && !p.neutral)!.id
        : g.current,
    ),
    [give, setGive] = useState(emptyHand()),
    [receive, setReceive] = useState(emptyHand());
  const valid =
    sum(give) > 0 &&
    sum(receive) > 0 &&
    RESOURCES.every((r) => !give[r] || !receive[r]);
  return (
    <Modal title="Un buen trato cambia la partida" onClose={onClose}>
      <p className="modal-intro">
        La otra persona recibirá la propuesta en su dispositivo.
      </p>
      <label className="field-label">
        Negociar con
        <select
          value={withPlayer}
          onChange={(e) => setWith(Number(e.target.value))}
        >
          {g.players
            .filter(
              (p) =>
                p.id !== you &&
                !p.neutral &&
                (you === g.current || p.id === g.current),
            )
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
      </label>
      <div className="offer-grid">
        <HandPicker
          label="Yo entrego"
          value={give}
          onChange={setGive}
          max={g.players[you].resources}
        />
        <HandPicker label="Yo recibo" value={receive} onChange={setReceive} />
      </div>
      <button
        className="primary full"
        disabled={!valid}
        onClick={() =>
          onOffer({ type: "offer", with: withPlayer, give, receive })
        }
      >
        Enviar propuesta <ChevronRight size={16} />
      </button>
    </Modal>
  );
}
function DevelopmentDialog({
  g,
  index,
  onClose,
  onPlay,
}: {
  g: PublicGame;
  index: number;
  onClose: () => void;
  onPlay: (a: Action) => void;
}) {
  const card = g.players[g.current].dev[index],
    [first, setFirst] = useState<Resource>("wood"),
    [second, setSecond] = useState<Resource>("grain");
  const plenty = card.kind === "plenty",
    needed = Math.min(2, sum(g.bank));
  const valid =
    !plenty ||
    (needed > 0 &&
      g.bank[first] >= 1 &&
      (needed < 2 || g.bank[second] >= (first === second ? 2 : 1)));
  return (
    <Modal title={DEV_NAMES[card.kind]} onClose={onClose}>
      <p className="modal-intro">{descriptions[card.kind]}</p>
      <ResourceSelect
        label={plenty ? "Primer recurso" : "Recurso que reclamas"}
        value={first}
        onChange={setFirst}
      />
      {plenty && needed > 1 && (
        <ResourceSelect
          label="Segundo recurso"
          value={second}
          onChange={setSecond}
        />
      )}
      <button
        className="primary full spaced"
        disabled={!valid}
        onClick={() =>
          onPlay({
            type: "playDev",
            index,
            resources: plenty && needed > 1 ? [first, second] : [first],
          })
        }
      >
        Jugar carta <Check size={16} />
      </button>
    </Modal>
  );
}
