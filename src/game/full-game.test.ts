import { it, expect } from "vitest";
import {
  createGame,
  applyAction,
  legalSettlements,
  legalCities,
  legalRoads,
  canPay,
  COSTS,
  sum,
  bankRate,
  victims,
  points,
  neutralOptions,
} from "./engine";
import { emptyHand, RESOURCES } from "./types";
import type { Action, Game, Resource } from "./types";

function routeTowardSettlement(g: Game): number | undefined {
  const p = g.current;
  const targets = new Set(legalSettlements(g, p, true));
  const starts = g.board.vertices
    .filter(
      (v) =>
        v.building?.owner === p ||
        (!v.building && v.edges.some((id) => g.board.edges[id].owner === p)),
    )
    .map((v) => v.id);
  const queue = starts.map((id) => ({ id, path: [] as number[] })),
    seen = new Set(starts);
  for (let i = 0; i < queue.length; i++) {
    const { id, path } = queue[i];
    if (path.length && targets.has(id)) return path[0];
    if (
      g.board.vertices[id].building &&
      g.board.vertices[id].building!.owner !== p
    )
      continue;
    for (const eid of g.board.vertices[id].edges) {
      const e = g.board.edges[eid];
      if (e.owner !== undefined) continue;
      const next = e.a === id ? e.b : e.a;
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push({ id: next, path: [...path, eid] });
    }
  }
  return undefined;
}
function choose(g: Game): { action: Action; actor: number } {
  const p = g.players[g.current],
    actor = g.current;
  if (g.phase === "neutralBuild") {
    const player = [2, 3].find((id) => neutralOptions(g, id).length)!;
    return {
      actor,
      action: {
        type: "neutralBuild",
        player,
        id: neutralOptions(g, player)[0],
      },
    };
  }
  if (g.phase === "setupSettlement") {
    const ids = legalSettlements(g);
    ids.sort(
      (a, b) =>
        g.board.vertices[b].tiles.reduce(
          (s, i) =>
            s +
            (g.board.tiles[i].number
              ? 6 - Math.abs(7 - g.board.tiles[i].number)
              : 0),
          0,
        ) -
        g.board.vertices[a].tiles.reduce(
          (s, i) =>
            s +
            (g.board.tiles[i].number
              ? 6 - Math.abs(7 - g.board.tiles[i].number)
              : 0),
          0,
        ),
    );
    return { actor, action: { type: "settlement", id: ids[0] } };
  }
  if (g.phase === "setupRoad" || g.phase === "freeRoads")
    return { actor, action: { type: "road", id: legalRoads(g)[0] } };
  if (g.phase === "discard") {
    const id = g.discardQueue[0],
      resources = emptyHand(),
      hand = { ...g.players[id].resources };
    const target = Math.floor(sum(hand) / 2);
    for (let i = 0; i < target; i++) {
      const r = [...RESOURCES].sort((a, b) => hand[b] - hand[a])[0];
      resources[r]++;
      hand[r]--;
    }
    return { actor: id, action: { type: "discard", resources } };
  }
  if (g.phase === "robber") {
    const tile = g.board.tiles
      .filter((t) => t.id !== g.robber)
      .sort(
        (a, b) =>
          b.vertices.reduce((s, id) => {
            const owner = g.board.vertices[id].building?.owner;
            return (
              s +
              (owner !== undefined && owner !== actor
                ? sum(g.players[owner].resources)
                : 0)
            );
          }, 0) -
          a.vertices.reduce((s, id) => {
            const owner = g.board.vertices[id].building?.owner;
            return (
              s +
              (owner !== undefined && owner !== actor
                ? sum(g.players[owner].resources)
                : 0)
            );
          }, 0),
      )[0];
    return { actor, action: { type: "robber", tile: tile.id } };
  }
  if (g.phase === "steal")
    return { actor, action: { type: "steal", player: victims(g)[0] } };
  if (!g.playedDev) {
    const index = p.dev.findIndex(
      (c) =>
        c.bought < g.turn &&
        c.kind !== "victory" &&
        (c.kind !== "roadBuilding" || legalRoads(g).length > 0) &&
        (c.kind !== "plenty" || sum(g.bank) > 0),
    );
    if (index >= 0) {
      const kind = p.dev[index].kind;
      if (kind === "monopoly") {
        const r = [...RESOURCES].sort((a, b) =>
          g.players
            .filter((q) => q.id !== actor)
            .reduce((s, q) => s + q.resources[b] - q.resources[a], 0),
        )[0];
        return { actor, action: { type: "playDev", index, resources: [r] } };
      }
      if (kind === "plenty") {
        const bank = { ...g.bank };
        const resources: Resource[] = [];
        for (let i = 0; i < Math.min(2, sum(g.bank)); i++) {
          const r = [...RESOURCES]
            .filter((r) => bank[r] > 0)
            .sort((a, b) => p.resources[a] - p.resources[b])[0];
          resources.push(r);
          bank[r]--;
        }
        return { actor, action: { type: "playDev", index, resources } };
      }
      return { actor, action: { type: "playDev", index } };
    }
  }
  if (g.phase === "roll") return { actor, action: { type: "roll" } };
  const settlement = legalSettlements(g),
    city = legalCities(g),
    road = routeTowardSettlement(g);
  const choices: { action: Action; cost: typeof COSTS.road }[] = [];
  if (settlement.length)
    choices.push({
      action: { type: "settlement", id: settlement[0] },
      cost: COSTS.settlement,
    });
  if (city.length)
    choices.push({ action: { type: "city", id: city[0] }, cost: COSTS.city });
  if (road !== undefined && legalRoads(g).includes(road))
    choices.push({ action: { type: "road", id: road }, cost: COSTS.road });
  if (g.deck.length)
    choices.push({ action: { type: "buyDev" }, cost: COSTS.development });
  const affordable = choices.find((c) => canPay(p.resources, c.cost));
  if (affordable) return { actor, action: affordable.action };
  for (const choice of choices) {
    const receive = RESOURCES.find(
      (r) => p.resources[r] < choice.cost[r] && g.bank[r] > 0,
    );
    if (!receive) continue;
    const give = RESOURCES.find(
      (r) =>
        r !== receive &&
        p.resources[r] - choice.cost[r] >= bankRate(g, actor, r),
    );
    if (give)
      return { actor, action: { type: "bank", give, receive, quantity: 1 } };
  }
  return { actor, action: { type: "end" } };
}
it.each([2, 4, 6, 8, 10])(
  "Una partida legal completa de %i jugadores llega a un ganador y conserva los recursos",
  (n) => {
    let g = createGame(
        Array.from({ length: n }, (_, i) => `Simulado ${i}`),
        5124 + n,
      ),
      steps = 0;
    const bank = n <= 4 ? 19 : n === 6 ? 24 : n === 8 ? 38 : 48;
    while (g.phase !== "finished" && steps < 12000) {
      const { action, actor } = choose(g);
      g = applyAction(g, action, actor);
      steps++;
      if (g.duel) {
        expect(g.current).toBeLessThan(2);
        expect(g.duel.supply + g.duel.tokens[0] + g.duel.tokens[1]).toBe(20);
        expect(g.players.slice(2).every((p) => sum(p.resources) === 0)).toBe(
          true,
        );
      }
      for (const r of RESOURCES) {
        expect(g.bank[r]).toBeGreaterThanOrEqual(0);
        expect(
          g.bank[r] + g.players.reduce((s, p) => s + p.resources[r], 0),
        ).toBe(bank);
      }
      expect(
        g.players.every((p) => RESOURCES.every((r) => p.resources[r] >= 0)),
      ).toBe(true);
    }
    expect(
      g.phase,
      `Sin ganador después de ${steps} acciones. Puntos: ${g.players.map((p) => points(g, p.id)).join(",")}`,
    ).toBe("finished");
    expect(points(g, g.winner!)).toBeGreaterThanOrEqual(10);
  },
  30000,
);
