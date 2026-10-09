import { describe, it, expect } from "vitest";
import { makeBoard } from "./board";
import {
  applyAction,
  createGame,
  legalSettlements,
  legalRoads,
  legalCities,
  remaining,
  points,
  longestRoad,
  refreshAwards,
  bankRate,
  produce,
  sum,
} from "./engine";
import { RESOURCES, emptyHand } from "./types";
import type { Action, Count, Game, Hand } from "./types";
const fresh = (n = 4) =>
  createGame(
    Array.from({ length: n }, (_, i) => `Jugador ${i + 1}`),
    71826,
  );
function step(g: Game, a: Action, actor = g.current) {
  return applyAction(g, a, actor);
}
export function setup(n = 4) {
  let g = fresh(n);
  while (g.phase.startsWith("setup")) {
    if (g.phase === "setupSettlement") {
      const positions = legalSettlements(g);
      expect(positions.length).toBeGreaterThan(0);
      const id = positions.sort(
        (a, b) =>
          g.board.vertices[b].tiles.length - g.board.vertices[a].tiles.length,
      )[0];
      g = step(g, { type: "settlement", id });
    } else g = step(g, { type: "road", id: legalRoads(g)[0] });
  }
  return g;
}
function active() {
  const g = setup();
  g.phase = "actions";
  return g;
}
function give(g: Game, p: number, h: Partial<Hand>) {
  for (const r of RESOURCES) {
    const n = h[r] || 0;
    g.players[p].resources[r] += n;
    g.bank[r] -= n;
  }
}
function graph(edges: [number, number][], owners?: number[]): Game {
  const g = fresh();
  const count = Math.max(...edges.flat()) + 1;
  g.board.vertices = Array.from({ length: count }, (_, id) => ({
    id,
    x: 0,
    y: 0,
    tiles: [],
    edges: [],
  }));
  g.board.edges = edges.map(([a, b], id) => {
    g.board.vertices[a].edges.push(id);
    g.board.vertices[b].edges.push(id);
    return { id, a, b, tiles: [], owner: owners?.[id] ?? 0 };
  });
  return g;
}
describe("Tableros y preparación", () => {
  it.each([
    [4, 19, 54, 72],
    [6, 30, 80, 109],
    [8, 37, undefined, undefined],
    [10, 52, undefined, undefined],
  ])(
    "%i jugadores: topología y recursos (%i terrenos)",
    (n, tiles, vertices, edges) => {
      const b = makeBoard(n as Count, 42);
      expect(b.tiles).toHaveLength(tiles!);
      if (vertices) expect(b.vertices).toHaveLength(vertices);
      if (edges) expect(b.edges).toHaveLength(edges);
      expect(b.tiles.every((t) => t.vertices.length === 6)).toBe(true);
      expect(
        b.edges.every((e) => e.tiles.length === 1 || e.tiles.length === 2),
      ).toBe(true);
      expect(
        new Set(b.ports.flatMap((p) => [b.edges[p.edge].a, b.edges[p.edge].b]))
          .size,
      ).toBe(b.ports.length * 2);
    },
  );
  it.each([4, 6, 8, 10])(
    "No hay 6 u 8 vecinos en 30 islas de %i jugadores",
    (n) => {
      for (let seed = 1; seed <= 30; seed++) {
        const b = makeBoard(n as Count, seed);
        for (const e of b.edges) {
          if (e.tiles.length === 2)
            expect(
              e.tiles.every((id) => [6, 8].includes(b.tiles[id].number)),
            ).toBe(false);
        }
      }
    },
  );
  it.each([4, 6, 8, 10])(
    "Completa la serpiente inicial para %i jugadores",
    (n) => {
      let g = fresh(n);
      const first = g.current,
        order = [];
      while (g.phase.startsWith("setup")) {
        if (g.phase === "setupSettlement") {
          order.push(g.current);
          const options = legalSettlements(g);
          g = step(g, { type: "settlement", id: options[0] });
        } else g = step(g, { type: "road", id: legalRoads(g)[0] });
      }
      expect(order).toEqual([
        ...Array.from({ length: n }, (_, i) => (first + i) % n),
        ...Array.from({ length: n }, (_, i) => (first + n - 1 - i) % n),
      ]);
      expect(g.current).toBe(first);
      expect(g.phase).toBe("roll");
      g.players.forEach((p) => {
        expect(points(g, p.id)).toBe(2);
        expect(remaining(g, p.id)).toEqual({
          road: 13,
          settlement: 3,
          city: 4,
        });
      });
      for (const r of RESOURCES)
        expect(
          g.bank[r] + g.players.reduce((a, p) => a + p.resources[r], 0),
        ).toBe(n === 4 ? 19 : n === 6 ? 24 : n === 8 ? 38 : 48);
    },
  );
  it("Usa los inventarios oficiales de desarrollo", () => {
    expect(fresh().deck).toHaveLength(25);
    const g = fresh(6);
    expect(g.deck).toHaveLength(34);
    expect(g.deck.filter((c) => c === "knight")).toHaveLength(20);
    expect(g.deck.filter((c) => c === "victory")).toHaveLength(5);
    expect(fresh(8).deck).toHaveLength(50);
    expect(fresh(10).deck).toHaveLength(68);
  });
  it("Respeta la distancia de poblados y el anclaje inicial", () => {
    let g = fresh();
    const v = legalSettlements(g)[0];
    g = step(g, { type: "settlement", id: v });
    const roads = legalRoads(g);
    expect(
      roads.every((id) =>
        [g.board.edges[id].a, g.board.edges[id].b].includes(v),
      ),
    ).toBe(true);
    g = step(g, { type: "road", id: roads[0] });
    const legal = legalSettlements(g);
    expect(legal).not.toContain(v);
    for (const id of g.board.vertices[v].edges) {
      const e = g.board.edges[id];
      expect(legal).not.toContain(e.a === v ? e.b : e.a);
    }
  });
});
describe("Validación y construcciones", () => {
  it("Rechaza fuera de turno y no cambia el estado original", () => {
    const g = active(),
      copy = structuredClone(g);
    expect(() => step(g, { type: "end" }, (g.current + 1) % 4)).toThrow(
      "turno",
    );
    expect(() => step(g, { type: "road", id: -1 })).toThrow();
    expect(g).toEqual(copy);
  });
  it("No permite construir antes de los dados", () => {
    const g = setup();
    expect(() => step(g, { type: "road", id: legalRoads(g)[0] })).toThrow();
  });
  it("Cobrar una carretera devuelve recursos al banco", () => {
    let g = active();
    give(g, g.current, { wood: 1, brick: 1 });
    const old = structuredClone(g);
    g = step(g, { type: "road", id: legalRoads(g)[0] });
    expect(g.bank.wood).toBe(old.bank.wood + 1);
    expect(g.bank.brick).toBe(old.bank.brick + 1);
    expect(remaining(g, g.current).road).toBe(12);
  });
  it("La ciudad devuelve el poblado y cuesta 3 minerales + 2 cereales", () => {
    let g = active();
    give(g, g.current, { ore: 3, grain: 2 });
    const old = structuredClone(g);
    g = step(g, { type: "city", id: legalCities(g)[0] });
    expect(remaining(g, g.current)).toMatchObject({ city: 3, settlement: 4 });
    expect(points(g, g.current)).toBe(3);
    expect(g.bank.ore).toBe(old.bank.ore + 3);
    expect(g.bank.grain).toBe(old.bank.grain + 2);
  });
  it("No se puede atravesar un edificio rival al extender una carretera", () => {
    const g = graph([
      [0, 1],
      [1, 2],
      [2, 3],
    ]);
    g.phase = "actions";
    g.current = 0;
    g.board.edges[1].owner = undefined;
    g.board.edges[2].owner = undefined;
    g.board.vertices[1].building = { owner: 1, city: false };
    expect(legalRoads(g, 0, false)).not.toContain(1);
  });
});
describe("Producción, banco y ladrón", () => {
  it("Produce una por poblado, dos por ciudad y el ladrón bloquea", () => {
    const g = fresh();
    const t = g.board.tiles.find((t) => t.resource === "wood")!;
    g.board.tiles.forEach((t) => (t.number = 2));
    t.number = 6;
    g.board.vertices[t.vertices[0]].building = { owner: 0, city: false };
    g.board.vertices[t.vertices[2]].building = { owner: 1, city: true };
    produce(g, 6);
    expect(g.players[0].resources.wood).toBe(1);
    expect(g.players[1].resources.wood).toBe(2);
    g.robber = t.id;
    produce(g, 6);
    expect(g.players[1].resources.wood).toBe(2);
  });
  it("Escasez: nadie recibe si hay varios; el único receptor toma lo disponible", () => {
    const g = fresh(),
      t = g.board.tiles.find((t) => t.resource === "grain")!;
    g.board.tiles.forEach((t) => (t.number = 2));
    t.number = 9;
    g.board.vertices[t.vertices[0]].building = { owner: 0, city: true };
    g.board.vertices[t.vertices[2]].building = { owner: 1, city: true };
    g.bank.grain = 1;
    produce(g, 9);
    expect(g.players[0].resources.grain).toBe(0);
    g.board.vertices[t.vertices[2]].building = undefined;
    produce(g, 9);
    expect(g.players[0].resources.grain).toBe(1);
    expect(g.bank.grain).toBe(0);
  });
  it("El siete activa descartes solo para manos mayores de 7", () => {
    let g = active();
    g.phase = "roll";
    g.players.forEach((p) => (p.resources = emptyHand()));
    g.players[0].resources.wood = 9;
    g.players[1].resources.wood = 7;
    g.players[2].resources.wood = 8;
    for (let seed = 1; seed < 1000; seed++) {
      g.rng = seed;
      const next = step(g, { type: "roll" });
      if (next.dice![0] + next.dice![1] === 7) {
        g = next;
        break;
      }
    }
    expect(g.phase).toBe("discard");
    expect(g.discardQueue).toEqual([0, 2]);
    expect(() =>
      step(g, { type: "discard", resources: { ...emptyHand(), wood: 3 } }, 0),
    ).toThrow("exactamente 4");
    g = step(g, { type: "discard", resources: { ...emptyHand(), wood: 4 } }, 0);
    expect(g.players[0].resources.wood).toBe(5);
    expect(() =>
      step(g, { type: "discard", resources: { ...emptyHand(), wood: 4 } }, 1),
    ).toThrow();
    g = step(g, { type: "discard", resources: { ...emptyHand(), wood: 4 } }, 2);
    expect(g.phase).toBe("robber");
  });
  it("El ladrón roba un único recurso a un rival adyacente", () => {
    let g = active();
    g.current = 0;
    g.phase = "robber";
    const t = g.board.tiles.find((t) => t.id !== g.robber)!;
    g.board.vertices[t.vertices[0]].building = { owner: 1, city: false };
    g.players[1].resources = { ...emptyHand(), ore: 3 };
    g = step(g, { type: "robber", tile: t.id });
    expect(g.phase).toBe("steal");
    const n = sum(g.players[0].resources);
    g = step(g, { type: "steal", player: 1 });
    expect(sum(g.players[0].resources)).toBe(n + 1);
    expect(g.players[1].resources.ore).toBe(2);
    expect(g.phase).toBe("actions");
  });
  it("El banco aplica 4:1, 3:1 y el puerto especializado 2:1", () => {
    const g = fresh();
    expect(bankRate(g, 0, "wood")).toBe(4);
    const any = g.board.ports.find((p) => p.resource === "any")!;
    g.board.vertices[g.board.edges[any.edge].a].building = {
      owner: 0,
      city: false,
    };
    expect(bankRate(g, 0, "wood")).toBe(3);
    const specific = g.board.ports.find((p) => p.resource === "wood")!;
    g.board.vertices[g.board.edges[specific.edge].a].building = {
      owner: 0,
      city: false,
    };
    expect(bankRate(g, 0, "wood")).toBe(2);
    expect(bankRate(g, 0, "ore")).toBe(3);
  });
  it("No acepta cantidades negativas, fraccionarias o recursos falsos", () => {
    const g = active();
    for (const quantity of [-1, 0, 0.5, NaN, Infinity])
      expect(() =>
        step(g, { type: "bank", give: "wood", receive: "ore", quantity }),
      ).toThrow();
    expect(() =>
      step(g, {
        type: "bank",
        give: "fake",
        receive: "ore",
        quantity: 1,
      } as unknown as Action),
    ).toThrow();
  });
});
describe("Intercambios entre jugadores", () => {
  it("Requiere aceptación real de la contraparte y conserva recursos", () => {
    let g = active();
    const a = g.current,
      b = (a + 1) % 4;
    give(g, a, { wood: 2 });
    give(g, b, { ore: 1 });
    const before = structuredClone(g);
    g = step(g, {
      type: "offer",
      with: b,
      give: { ...emptyHand(), wood: 2 },
      receive: { ...emptyHand(), ore: 1 },
    });
    expect(() => step(g, { type: "acceptTrade", player: b }, a)).toThrow();
    expect(() => step(g, { type: "end" })).toThrow("oferta");
    g = step(g, { type: "acceptTrade", player: b }, b);
    expect(g.players[a].resources.ore).toBe(
      before.players[a].resources.ore + 1,
    );
    expect(g.players[b].resources.wood).toBe(
      before.players[b].resources.wood + 2,
    );
    expect(g.bank).toEqual(before.bank);
    expect(g.trade).toBeNull();
  });
  it("Impide regalos y cambiar el mismo recurso por sí mismo", () => {
    const g = active(),
      b = (g.current + 1) % 4;
    give(g, g.current, { wood: 2 });
    expect(() =>
      step(g, {
        type: "offer",
        with: b,
        give: emptyHand(),
        receive: { ...emptyHand(), wood: 1 },
      }),
    ).toThrow("regalos");
    expect(() =>
      step(g, {
        type: "offer",
        with: b,
        give: { ...emptyHand(), wood: 1 },
        receive: { ...emptyHand(), wood: 1 },
      }),
    ).toThrow("mismo");
  });
});
describe("Desarrollo, premios y victoria", () => {
  it("La carta recién comprada no se juega en ese turno", () => {
    let g = active();
    give(g, g.current, { wool: 1, grain: 1, ore: 1 });
    g.deck = ["knight"];
    g = step(g, { type: "buyDev" });
    expect(() => step(g, { type: "playDev", index: 0 })).toThrow("este turno");
  });
  it("Un caballero antes de los dados vuelve a producción, sin descartar", () => {
    let g = setup();
    g.players[g.current].dev = [{ kind: "knight", bought: 0 }];
    g = step(g, { type: "playDev", index: 0 });
    expect(g.phase).toBe("robber");
    expect(g.discardQueue).toEqual([]);
    const tile = g.board.tiles.find(
      (t) =>
        t.id !== g.robber &&
        t.vertices.every((id) => !g.board.vertices[id].building),
    )!;
    g = step(g, { type: "robber", tile: tile.id });
    expect(g.phase).toBe("roll");
    expect(g.playedDev).toBe(true);
  });
  it("Monopolio recoge todos los recursos y solo una carta por turno", () => {
    let g = active();
    g.players[g.current].dev = [
      { kind: "monopoly", bought: 0 },
      { kind: "knight", bought: 0 },
    ];
    for (const p of g.players) if (p.id !== g.current) p.resources.ore = 2;
    const old = g.players[g.current].resources.ore;
    g = step(g, { type: "playDev", index: 0, resources: ["ore"] });
    expect(g.players[g.current].resources.ore).toBe(old + 6);
    expect(
      g.players
        .filter((p) => p.id !== g.current)
        .every((p) => p.resources.ore === 0),
    ).toBe(true);
    expect(() => step(g, { type: "playDev", index: 0 })).toThrow("una carta");
  });
  it("Abundancia permite dos iguales, verifica stock y conserva la carta en errores", () => {
    let g = active();
    g.players[g.current].dev = [{ kind: "plenty", bought: 0 }];
    g.bank.ore = 1;
    expect(() =>
      step(g, { type: "playDev", index: 0, resources: ["ore", "ore"] }),
    ).toThrow("dispone");
    expect(g.players[g.current].dev).toHaveLength(1);
    g.bank.ore = 2;
    const old = g.players[g.current].resources.ore;
    g = step(g, { type: "playDev", index: 0, resources: ["ore", "ore"] });
    expect(g.players[g.current].resources.ore).toBe(old + 2);
  });
  it("Dos carreteras gratis se resuelven antes de otra acción", () => {
    let g = active();
    g.players[g.current].dev = [{ kind: "roadBuilding", bought: 0 }];
    const before = structuredClone(g.players[g.current].resources);
    g = step(g, { type: "playDev", index: 0 });
    expect(g.phase).toBe("freeRoads");
    expect(() => step(g, { type: "end" })).toThrow();
    g = step(g, { type: "road", id: legalRoads(g)[0] });
    g = step(g, { type: "road", id: legalRoads(g)[0] });
    expect(g.phase).toBe("actions");
    expect(g.players[g.current].resources).toEqual(before);
  });
  it("La ruta cuenta ciclos, no suma bifurcaciones y se corta por un rival", () => {
    let g = graph([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [2, 6],
    ]);
    expect(longestRoad(g, 0)).toBe(5);
    g.board.vertices[2].building = { owner: 1, city: false };
    expect(longestRoad(g, 0)).toBe(3);
    g = graph([
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 0],
      [0, 6],
    ]);
    expect(longestRoad(g, 0)).toBe(7);
  });
  it("El poseedor conserva empates de ruta y de ejército", () => {
    const edges: [number, number][] = [];
    for (let p = 0; p < 2; p++)
      for (let i = 0; i < 5; i++) edges.push([p * 6 + i, p * 6 + i + 1]);
    const g = graph(edges, [0, 0, 0, 0, 0, 1, 1, 1, 1, 1]);
    g.longest = 0;
    g.players[0].knights = 3;
    g.players[1].knights = 3;
    g.army = 0;
    refreshAwards(g);
    expect(g.longest).toBe(0);
    expect(g.army).toBe(0);
    g.longest = null;
    refreshAwards(g);
    expect(g.longest).toBeNull();
    g.players[1].knights = 4;
    refreshAwards(g);
    expect(g.army).toBe(1);
  });
  it("Los puntos secretos recién comprados pueden dar la victoria", () => {
    let g = active();
    for (const v of g.board.vertices) v.building = undefined;
    for (let i = 0; i < 4; i++)
      g.board.vertices[i].building = { owner: g.current, city: true };
    g.board.vertices[4].building = { owner: g.current, city: false };
    g.deck = ["victory"];
    give(g, g.current, { wool: 1, grain: 1, ore: 1 });
    g = step(g, { type: "buyDev" });
    expect(g.phase).toBe("finished");
    expect(g.winner).toBe(g.current);
    expect(points(g, g.current)).toBe(10);
  });
  it.each([6, 8, 10])(
    "Turno de pareja completo y restringido con %i jugadores",
    (n) => {
      let g = setup(n);
      g.phase = "actions";
      const first = g.current;
      g = step(g, { type: "end" });
      expect(g.current).toBe((first + n / 2) % n);
      expect(g.paired).toBe(true);
      expect(g.phase).toBe("actions");
      expect(() => step(g, { type: "roll" })).toThrow();
      expect(() =>
        step(g, {
          type: "offer",
          with: first,
          give: emptyHand(),
          receive: emptyHand(),
        }),
      ).toThrow("pareja");
      g = step(g, { type: "end" });
      expect(g.current).toBe((first + 1) % n);
      expect(g.paired).toBe(false);
      expect(g.phase).toBe("roll");
    },
  );
});
