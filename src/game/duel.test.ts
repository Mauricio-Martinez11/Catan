import { describe, expect, it } from "vitest";
import {
  applyAction,
  createGame,
  legalRoads,
  legalSettlements,
  neutralOptions,
  produce,
  refreshAwards,
  sum,
  tokenCost,
  victims,
} from "./engine";
import { emptyHand, RESOURCES } from "./types";
import type { Game, Hand } from "./types";

function duel(setup = true): Game {
  let g = createGame(["Ana", "Luis"], 925);
  if (setup) {
    while (g.phase.startsWith("setup")) {
      const action =
        g.phase === "setupSettlement"
          ? { type: "settlement" as const, id: legalSettlements(g)[0] }
          : { type: "road" as const, id: legalRoads(g)[0] };
      g = applyAction(g, action, g.current);
    }
  }
  return g;
}
function fund(g: Game, p: number, hand: Partial<Hand>) {
  for (const r of RESOURCES) {
    const amount = hand[r] ?? 0;
    g.players[p].resources[r] += amount;
    g.bank[r] -= amount;
  }
}
function neutral(g: Game): Game {
  const player = [2, 3].find((p) => neutralOptions(g, p).length)!;
  return applyAction(
    g,
    { type: "neutralBuild", player, id: neutralOptions(g, player)[0] },
    g.current,
  );
}
function clearSeven(g: Game): Game {
  while (g.phase === "discard") {
    const actor = g.discardQueue[0],
      resources = emptyHand();
    let needed = Math.floor(sum(g.players[actor].resources) / 2);
    for (const r of RESOURCES) {
      resources[r] = Math.min(needed, g.players[actor].resources[r]);
      needed -= resources[r];
    }
    g = applyAction(g, { type: "discard", resources }, actor);
  }
  if (g.phase === "robber") {
    g = applyAction(
      g,
      {
        type: "robber",
        tile: g.board.tiles.find((t) => t.id !== g.robber)!.id,
      },
      g.current,
    );
  }
  if (g.phase === "steal")
    g = applyAction(g, { type: "steal", player: victims(g)[0] }, g.current);
  return g;
}

describe("Duelo de CATAN para dos", () => {
  it("Prepara el inventario base, 20 fichas y los dos poblados neutrales del diagrama", () => {
    const g = duel(false);
    expect(g.board.tiles).toHaveLength(19);
    expect(g.board.vertices).toHaveLength(54);
    expect(g.board.ports).toHaveLength(9);
    expect(g.bank).toEqual(emptyHand(19));
    expect(g.deck).toHaveLength(25);
    expect(g.duel!.tokens).toEqual([5, 5]);
    expect(g.duel!.supply).toBe(10);
    expect(g.board.vertices[g.board.tiles[1].vertices[2]].building?.owner).toBe(
      2,
    );
    expect(
      g.board.vertices[g.board.tiles[17].vertices[5]].building?.owner,
    ).toBe(3);
    expect(g.board.edges.every((e) => e.owner === undefined)).toBe(true);
  });
  it("La preparación solo da dos poblados y dos carreteras a cada humano", () => {
    const g = duel();
    for (const id of [0, 1, 2, 3]) {
      expect(
        g.board.vertices.filter((v) => v.building?.owner === id),
      ).toHaveLength(id < 2 ? 2 : 1);
      expect(g.board.edges.filter((e) => e.owner === id)).toHaveLength(
        id < 2 ? 2 : 0,
      );
    }
    expect(g.duel!.tokens.reduce((a, b) => a + b) + g.duel!.supply).toBe(20);
    expect(g.phase).toBe("roll");
  });
  it("Completa dos producciones distintas, incluso si el azar repite el resultado", () => {
    let g = duel();
    const seed = g.rng;
    g = clearSeven(applyAction(g, { type: "roll" }, g.current));
    expect(g.phase).toBe("roll");
    expect(() => applyAction(g, { type: "end" }, g.current)).toThrow();
    g.rng = seed; // Force the same first random roll; it must be retried.
    g = clearSeven(applyAction(g, { type: "roll" }, g.current));
    expect(g.phase).toBe("actions");
    expect(new Set(g.duel!.rolls).size).toBe(2);
    expect(g.distribution.reduce((a, b) => a + b)).toBe(2);
    const previous = g.current;
    g = applyAction(g, { type: "end" }, previous);
    expect(g.current).toBe(1 - previous);
    expect(g.paired).toBe(false);
    expect(g.duel!.rolls).toEqual([]);
  });
  it.each([0, 1])(
    "Un siete en la producción %i resuelve descartes antes de continuar",
    (rollIndex) => {
      let g = duel();
      fund(g, 0, { wood: 8 });
      fund(g, 1, { brick: 8 });
      if (rollIndex) g.duel!.rolls = [6];
      let rolled: Game | undefined;
      for (let seed = 1; seed < 1000; seed++) {
        g.rng = seed;
        const candidate = applyAction(g, { type: "roll" }, g.current);
        if (candidate.dice![0] + candidate.dice![1] === 7) {
          rolled = candidate;
          break;
        }
      }
      expect(rolled!.phase).toBe("discard");
      expect(rolled!.discardQueue).toEqual([0, 1]);
      g = clearSeven(rolled!);
      expect(g.phase).toBe(rollIndex ? "actions" : "roll");
    },
  );
  it("Los neutrales no producen, no roban turnos y no aceptan intercambios", () => {
    const g = duel();
    for (let total = 2; total <= 12; total++) produce(g, total);
    expect(sum(g.players[2].resources) + sum(g.players[3].resources)).toBe(0);
    expect(() => applyAction(g, { type: "roll" }, 2)).toThrow(
      "Jugador inválido",
    );
    g.phase = "actions";
    expect(() =>
      applyAction(
        g,
        { type: "offer", with: 2, give: emptyHand(1), receive: emptyHand(1) },
        g.current,
      ),
    ).toThrow("otro jugador");
    g.robber = g.board.vertices.find((v) => v.building?.owner === 2)!.tiles[0];
    expect(victims(g)).not.toContain(2);
  });
  it("Cada carretera exige una neutral gratuita y valida su propietario y posición", () => {
    let g = duel();
    g.phase = "actions";
    fund(g, g.current, { wood: 1, brick: 1 });
    g = applyAction(g, { type: "road", id: legalRoads(g)[0] }, g.current);
    const hand = { ...g.players[g.current].resources };
    expect(g.phase).toBe("neutralBuild");
    expect(() => applyAction(g, { type: "end" }, g.current)).toThrow();
    expect(() =>
      applyAction(
        g,
        { type: "neutralBuild", player: g.current, id: legalRoads(g)[0] },
        g.current,
      ),
    ).toThrow("válida");
    g = neutral(g);
    expect(g.phase).toBe("actions");
    expect(g.players[g.current].resources).toEqual(hand);
    expect(
      g.board.edges.filter((e) => e.owner !== undefined && e.owner >= 2),
    ).toHaveLength(1);
  });
  it("Construcción de carreteras intercala neutrales y vuelve a la fase anterior", () => {
    let g = duel();
    g.players[g.current].dev.push({ kind: "roadBuilding", bought: 0 });
    g = applyAction(g, { type: "playDev", index: 0 }, g.current);
    for (let i = 0; i < 2; i++) {
      g = applyAction(g, { type: "road", id: legalRoads(g)[0] }, g.current);
      expect(g.phase).toBe("neutralBuild");
      g = neutral(g);
      expect(g.phase).toBe(i ? "roll" : "freeRoads");
    }
    expect(g.duel!.rolls).toEqual([]);
    expect(g.playedDev).toBe(true);
  });
  it.each([false, true])(
    "Un poblado solicita construcción neutral (conexión neutral: %s)",
    (connected) => {
      let g = duel();
      g.phase = "actions";
      if (connected) {
        for (let i = 0; i < 14 && !legalSettlements(g, 2, false).length; i++)
          g.board.edges[legalRoads(g, 2, false)[0]].owner = 2;
        expect(legalSettlements(g, 2, false).length).toBeGreaterThan(0);
      }
      const id = legalSettlements(g, g.current, true).find((id) =>
        g.board.vertices[id].edges.some(
          (i) => g.board.edges[i].owner === undefined,
        ),
      )!;
      g.board.edges[
        g.board.vertices[id].edges.find(
          (i) => g.board.edges[i].owner === undefined,
        )!
      ].owner = g.current;
      fund(g, g.current, { wood: 1, brick: 1, wool: 1, grain: 1 });
      g = applyAction(g, { type: "settlement", id }, g.current);
      expect(g.duel!.neutralBuild!.kind).toBe(
        connected ? "settlement" : "road",
      );
      g = neutral(g);
      expect(g.phase).toBe("actions");
    },
  );
  it("Un neutral puede obtener la mayor ruta, pero nunca es el ganador", () => {
    const g = duel();
    for (let i = 0; i < 15 && g.roadLengths[2] < 5; i++) {
      g.board.edges[legalRoads(g, 2, false)[0]].owner = 2;
      refreshAwards(g);
    }
    expect(g.longest).toBe(2);
    expect(g.winner).toBeNull();
  });
  it("Las fichas ignoran puntos secretos y el comercio forzado obliga a devolver dos cartas", () => {
    let g = duel(false);
    g.phase = "actions";
    g.current = 0;
    g.players[0].dev = Array.from({ length: 4 }, () => ({
      kind: "victory",
      bought: 0,
    }));
    expect(tokenCost(g, 0)).toBe(1);
    fund(g, 1, { ore: 2 });
    const tokens = g.duel!.tokens[0];
    g = applyAction(g, { type: "forceTrade" }, 0);
    expect(g.phase).toBe("forcedTrade");
    expect(g.players[0].resources.ore).toBe(2);
    expect(g.duel!.tokens[0]).toBe(tokens - 1);
    expect(() => applyAction(g, { type: "end" }, 0)).toThrow();
    expect(() =>
      applyAction(
        g,
        { type: "returnTrade", resources: { ...emptyHand(), ore: 1 } },
        0,
      ),
    ).toThrow("dos recursos");
    expect(() =>
      applyAction(
        g,
        { type: "returnTrade", resources: { ...emptyHand(), ore: 2 } },
        1,
      ),
    ).toThrow("turno");
    g = applyAction(
      g,
      { type: "returnTrade", resources: { ...emptyHand(), ore: 2 } },
      0,
    );
    expect(g.phase).toBe("actions");
    expect(g.players[1].resources.ore).toBe(2);
    expect(() => applyAction(g, { type: "forceTrade" }, 0)).toThrow(
      "una acción por turno",
    );
  });
  it("Una sola carta rival exige devolver dos; una mano vacía no permite forzar", () => {
    let g = duel(false);
    g.phase = "roll";
    g.current = 0;
    expect(() => applyAction(g, { type: "forceTrade" }, 0)).toThrow(
      "no tiene recursos",
    );
    fund(g, 1, { ore: 1 });
    expect(() => applyAction(g, { type: "forceTrade" }, 0)).toThrow(
      "devolver dos",
    );
    fund(g, 0, { wood: 1 });
    g = applyAction(g, { type: "forceTrade" }, 0);
    g = applyAction(
      g,
      { type: "returnTrade", resources: { ...emptyHand(), wood: 1, ore: 1 } },
      0,
    );
    expect(g.phase).toBe("roll");
    expect(sum(g.players[1].resources)).toBe(2);
  });
  it("Expulsa al ladrón sin robar, aplica coste por puntos visibles y reinicia el límite", () => {
    let g = duel(false);
    g.phase = "actions";
    g.current = g.primary = 0;
    const id = legalSettlements(g, 0, true)[0];
    g.board.vertices[id].building = { owner: 0, city: true };
    expect(tokenCost(g, 0)).toBe(2);
    g.robber = g.board.tiles.find((t) => t.resource !== "desert")!.id;
    const before = g.players.map((p) => ({ ...p.resources }));
    g = applyAction(g, { type: "chaseRobber" }, 0);
    expect(g.duel!.tokens[0]).toBe(3);
    expect(g.board.tiles[g.robber].resource).toBe("desert");
    expect(g.players.map((p) => p.resources)).toEqual(before);
    g = applyAction(g, { type: "end" }, 0);
    expect(g.duel!.spent).toBe(false);
    expect(g.current).toBe(1);
  });
  it("Retirar un caballero puede perder el ejército aun al empatar y solo se permite una vez", () => {
    let g = duel(false);
    g.phase = "roll";
    g.current = 0;
    g.players[0].knights = 4;
    g.players[1].knights = 3;
    refreshAwards(g);
    expect(g.army).toBe(0);
    g = applyAction(g, { type: "retireKnight" }, 0);
    expect(g.army).toBeNull();
    expect(g.players[0].knights).toBe(3);
    expect(g.duel!.tokens[0]).toBe(7);
    expect(g.playedDev).toBe(false);
    expect(g.duel!.spent).toBe(false);
    expect(() => applyAction(g, { type: "retireKnight" }, 0)).toThrow();
  });
  it("Las fichas por costa y desierto se acumulan sin superar la reserva", () => {
    let g = duel(false);
    const id = legalSettlements(g)[0];
    const v = g.board.vertices[id];
    expect(v.tiles.length).toBeLessThan(3);
    g.board.tiles[v.tiles[0]].resource = "desert";
    const who = g.current;
    g = applyAction(g, { type: "settlement", id }, who);
    expect(g.duel!.tokens[who]).toBe(8);
    expect(g.duel!.supply).toBe(7);
  });
});
