import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalRoads,
  legalSettlements,
  sum,
} from "../src/game/engine";
import { emptyHand } from "../src/game/types";
import type { Game, TurnClock } from "../src/game/types";
import {
  advanceClock,
  expireClock,
  startClock,
  TURN_MS,
  ROBBER_MS,
} from "./timing";

function prepared(n = 4) {
  let g = createGame(
    Array.from({ length: n }, (_, i) => `Jugador ${i}`),
    836,
  );
  while (g.phase.startsWith("setup"))
    g = applyAction(
      g,
      g.phase === "setupSettlement"
        ? { type: "settlement", id: legalSettlements(g)[0] }
        : { type: "road", id: legalRoads(g)[0] },
      g.current,
    );
  return g;
}
function budget(g: Game, now = 1000) {
  return startClock(g, now)!;
}
function finishRobberFixture(g: Game) {
  const tile = g.board.tiles.find(
    (t) =>
      t.id !== g.robber &&
      !t.vertices.some((id) => {
        const b = g.board.vertices[id].building;
        return b && b.owner !== g.current && !g.players[b.owner].neutral;
      }),
  )!;
  return applyAction(g, { type: "robber", tile: tile.id }, g.current);
}

describe("Reloj compartido de la mesa", () => {
  it("Da 90 segundos por pareja de colocaciones, sin renovar entre poblado y carretera", () => {
    let g = createGame(["a", "b"], 52);
    let c = budget(g);
    expect(c.duration).toBe(TURN_MS);
    const settlement = applyAction(
      g,
      { type: "settlement", id: legalSettlements(g)[0] },
      g.current,
    );
    expect(advanceClock(g, settlement, c, 41000)).toEqual(c);
    const road = applyAction(
      settlement,
      { type: "road", id: legalRoads(settlement)[0] },
      settlement.current,
    );
    c = advanceClock(settlement, road, c, 50000)!;
    expect(c.deadline).toBe(140000);
    expect(c.player).toBe(road.current);
  });
  it("No actúa antes del límite; al vencer la preparación coloca piezas legales", () => {
    const g = createGame(["a", "b"], 52),
      c = budget(g);
    expect(expireClock(g, c, c.deadline - 1, () => 0.2).changed).toBe(false);
    const r = expireClock(g, c, c.deadline, () => 0.2);
    expect(r.game.setupStep).toBe(1);
    expect(
      r.game.board.edges.filter((e) => e.owner === g.current),
    ).toHaveLength(1);
    expect(r.clock!.deadline).toBe(c.deadline + TURN_MS);
  });
  it("Ofrecer y cancelar intercambios no renueva el reloj", () => {
    let g = prepared();
    g.phase = "actions";
    g.players[g.current].resources.wood = 2;
    const c = budget(g),
      other = (g.current + 1) % 4;
    const offered = applyAction(
      g,
      {
        type: "offer",
        with: other,
        give: { ...emptyHand(), wood: 1 },
        receive: { ...emptyHand(), ore: 1 },
      },
      g.current,
    );
    expect(advanceClock(g, offered, c, 25000)).toEqual(c);
    const closed = applyAction(offered, { type: "declineTrade" }, other);
    expect(advanceClock(offered, closed, c, 70000)).toEqual(c);
  });
  it("Un turno vencido cierra ofertas y pasa, sin pagar construcciones ni aceptar tratos", () => {
    let g = prepared();
    g.phase = "actions";
    g.players[g.current].resources.wood = 2;
    g = applyAction(
      g,
      {
        type: "offer",
        with: (g.current + 1) % 4,
        give: { ...emptyHand(), wood: 1 },
        receive: { ...emptyHand(), ore: 1 },
      },
      g.current,
    );
    const hands = g.players.map((p) => ({ ...p.resources })),
      c = budget(g);
    const r = expireClock(g, c, c.deadline, () => 0.2);
    expect(r.game.trade).toBeNull();
    expect(r.game.current).not.toBe(g.current);
    expect(r.game.players.map((p) => p.resources)).toEqual(hands);
    expect(r.game.board).toEqual(g.board);
    expect(r.clock!.duration).toBe(TURN_MS);
  });
  it.each([4, 6, 8, 10])(
    "También concede 90 segundos al siguiente turno de %i jugadores",
    (n) => {
      const g = prepared(n);
      g.phase = "actions";
      const r = expireClock(g, budget(g), 91000, () => 0.1);
      expect(r.clock!.deadline).toBe(181000);
      expect(r.game.paired).toBe(n > 4);
      expect(r.clock!.player).toBe(r.game.current);
    },
  );
  it("Pausa el presupuesto del turno y da 30 segundos compartidos a movimiento y robo", () => {
    const g = prepared();
    g.phase = "actions";
    g.players[g.current].dev = [{ kind: "knight", bought: 0 }];
    const robber = applyAction(g, { type: "playDev", index: 0 }, g.current);
    const c = advanceClock(g, robber, budget(g), 11000)!;
    expect(c.deadline).toBe(41000);
    expect(c.remainingTurnMs).toBe(80000);
    const steal = { ...robber, phase: "steal" as const };
    expect(advanceClock(robber, steal, c, 20000)).toEqual(c);
    const resumed = finishRobberFixture(robber);
    const next = advanceClock(robber, resumed, c, 25000)!;
    expect(next.kind).toBe("turn");
    expect(next.deadline).toBe(105000);
  });
  it("Da 30 segundos a cada descarte y luego 30 al ladrón, sin vaciar todas las manos", () => {
    const g = prepared();
    g.phase = "discard";
    g.discardQueue = [0, 1];
    g.returnPhase = "actions";
    for (const p of g.players) p.resources = emptyHand();
    g.players[0].resources.wood = 9;
    g.players[1].resources.ore = 8;
    const c: TurnClock = {
      kind: "discard",
      player: 0,
      deadline: 30000,
      duration: ROBBER_MS,
      remainingTurnMs: 52000,
    };
    const first = expireClock(g, c, 30000, () => 0.3);
    expect(sum(first.game.players[0].resources)).toBe(5);
    expect(sum(first.game.players[1].resources)).toBe(8);
    expect(first.clock!.player).toBe(1);
    expect(first.clock!.deadline).toBe(60000);
    const second = expireClock(first.game, first.clock!, 60000, () => 0.3);
    expect(sum(second.game.players[1].resources)).toBe(4);
    expect(second.game.phase).toBe("robber");
    expect(second.clock!.kind).toBe("robber");
    expect(second.clock!.deadline).toBe(90000);
    expect(second.clock!.remainingTurnMs).toBe(52000);
  });
  it("Al vencer el ladrón se mueve a otro terreno y resuelve el robo dentro del mismo límite", () => {
    const g = prepared();
    g.phase = "robber";
    g.returnPhase = "actions";
    const c: TurnClock = {
      kind: "robber",
      player: g.current,
      deadline: 30000,
      duration: ROBBER_MS,
      remainingTurnMs: 3000,
    };
    const r = expireClock(g, c, 30000, () => 0.5);
    expect(r.game.robber).not.toBe(g.robber);
    expect(r.game.phase).toBe("actions");
    expect(r.clock!.deadline).toBe(33000);
  });
  it("Las dos producciones del duelo se resuelven al agotarse el turno, sin atascarlo", () => {
    const g = prepared(2),
      c = budget(g);
    let r = expireClock(g, c, c.deadline, () => 0.5);
    for (let i = 0; i < 5 && r.game.turn === g.turn; i++)
      r = expireClock(r.game, r.clock!, r.clock!.deadline, () => 0.5);
    expect(r.game.turn).toBeGreaterThan(g.turn);
    expect(r.game.distribution.reduce((a, b) => a + b)).toBe(2);
    expect(r.game.current).toBe(1 - g.current);
  });
  it("Termina carreteras gratuitas y sus neutrales antes de pasar el turno", () => {
    let g = prepared(2);
    g.phase = "actions";
    g.players[g.current].dev = [{ kind: "roadBuilding", bought: 0 }];
    g = applyAction(g, { type: "playDev", index: 0 }, g.current);
    const c = budget(g),
      hands = g.players.map((p) => ({ ...p.resources }));
    const r = expireClock(g, c, c.deadline, () => 0.5);
    expect(r.game.current).not.toBe(g.current);
    expect(r.game.players.map((p) => p.resources)).toEqual(hands);
    expect(
      r.game.board.edges.filter((e) => e.owner !== undefined && e.owner >= 2),
    ).toHaveLength(2);
  });
  it("Devuelve dos cartas en un comercio forzado pendiente y termina el turno", () => {
    let g = prepared(2);
    g.phase = "actions";
    g.players[g.current].resources.wood = 2;
    g.players[1 - g.current].resources.ore = 2;
    const total = g.players.reduce((a, p) => a + sum(p.resources), 0);
    g = applyAction(g, { type: "forceTrade" }, g.current);
    const c = budget(g),
      r = expireClock(g, c, c.deadline, () => 0.2);
    expect(r.game.phase).toBe("roll");
    expect(r.game.current).not.toBe(g.current);
    expect(r.game.duel!.forcedTradeReturn).toBeNull();
    expect(r.game.players.reduce((a, p) => a + sum(p.resources), 0)).toBe(
      total,
    );
  });
  it("Una victoria detiene el reloj", () => {
    const g = prepared();
    const ended = { ...g, phase: "finished" as const, winner: g.current };
    expect(advanceClock(g, ended, budget(g), 12345)).toBeNull();
  });
});
