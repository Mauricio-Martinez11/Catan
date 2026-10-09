import { makeBoard, random, shuffle } from "./board";
import { emptyHand, PLAYER_COLORS, RESOURCES, NAMES, DEV_NAMES } from "./types";
import type { Action, Count, DevKind, Game, Hand, Resource } from "./types";

export const COSTS: Record<
  "road" | "settlement" | "city" | "development",
  Hand
> = {
  road: { wood: 1, brick: 1, wool: 0, grain: 0, ore: 0 },
  settlement: { wood: 1, brick: 1, wool: 1, grain: 1, ore: 0 },
  city: { wood: 0, brick: 0, wool: 0, grain: 2, ore: 3 },
  development: { wood: 0, brick: 0, wool: 1, grain: 1, ore: 1 },
};
export const sum = (h: Hand): number => RESOURCES.reduce((n, r) => n + h[r], 0);
export const canPay = (h: Hand, cost: Hand): boolean =>
  RESOURCES.every((r) => h[r] >= cost[r]);
export const humanCount = (g: Game): number => (g.duel ? 2 : g.players.length);
export const tokenCost = (g: Game, p: number): number =>
  points(g, p, false) > points(g, 1 - p, false) ? 2 : 1;
function insist(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}
function message(g: Game, text: string) {
  g.log.unshift(text);
  g.log = g.log.slice(0, 120);
}
function nextRandom(g: Game) {
  g.rng = (g.rng + 0x6d2b79f5) >>> 0;
  return random(g.rng)();
}
function transfer(from: Hand, to: Hand, amount: Hand) {
  RESOURCES.forEach((r) => {
    from[r] -= amount[r];
    to[r] += amount[r];
  });
}
function validHand(h: unknown): h is Hand {
  return (
    !!h &&
    typeof h === "object" &&
    RESOURCES.every(
      (r) =>
        Number.isSafeInteger((h as Hand)[r]) &&
        (h as Hand)[r] >= 0 &&
        (h as Hand)[r] <= 1000,
    )
  );
}
function resource(r: unknown): r is Resource {
  return RESOURCES.includes(r as Resource);
}
function countBuildings(g: Game, p: number, city: boolean) {
  return g.board.vertices.filter(
    (v) => v.building?.owner === p && v.building.city === city,
  ).length;
}
export function remaining(g: Game, p: number) {
  return {
    road: 15 - g.board.edges.filter((e) => e.owner === p).length,
    settlement: 5 - countBuildings(g, p, false),
    city: 4 - countBuildings(g, p, true),
  };
}
export function points(g: Game, p: number, hidden = true): number {
  return (
    g.board.vertices.reduce(
      (n, v) => n + (v.building?.owner === p ? (v.building.city ? 2 : 1) : 0),
      0,
    ) +
    (g.longest === p ? 2 : 0) +
    (g.army === p ? 2 : 0) +
    (hidden ? g.players[p].dev.filter((c) => c.kind === "victory").length : 0)
  );
}
export function createGame(
  names: string[],
  seed: number,
  boardSeed = seed,
  entropy?: () => number,
): Game {
  insist(
    [2, 4, 6, 8, 10].includes(names.length),
    "Elige 2, 4, 6, 8 o 10 jugadores.",
  );
  const n = names.length,
    rng = entropy || random(seed),
    factor = n >= 8 ? 2 : 1,
    expanded = n === 6 || n === 10;
  const deck: DevKind[] = shuffle(
    [
      ...Array<DevKind>((expanded ? 20 : 14) * factor).fill("knight"),
      ...Array<DevKind>(5 * factor).fill("victory"),
      ...(["roadBuilding", "plenty", "monopoly"] as DevKind[]).flatMap((k) =>
        Array<DevKind>((expanded ? 3 : 2) * factor).fill(k),
      ),
    ],
    rng,
  );
  const rolls = names.map(
    () => 1 + Math.floor(rng() * 6) + 1 + Math.floor(rng() * 6),
  );
  let tied = rolls.flatMap((v, i) => (v === Math.max(...rolls) ? [i] : []));
  while (tied.length > 1) {
    const tieRolls = tied.map(
      () => 2 + Math.floor(rng() * 6) + Math.floor(rng() * 6),
    );
    tied = tied.filter((_, i) => tieRolls[i] === Math.max(...tieRolls));
  }
  const first = tied[0];
  const board = makeBoard(n as Count, boardSeed);
  if (n === 2) {
    // The two marked intersections in the CATAN for Two setup diagram.
    board.vertices[board.tiles[1].vertices[2]].building = {
      owner: 2,
      city: false,
    };
    board.vertices[board.tiles[17].vertices[5]].building = {
      owner: 3,
      city: false,
    };
  }
  const colors =
    n === 2 ? [...names, "Neutral ámbar", "Neutral violeta"] : names;
  return {
    version: 1,
    id: Date.now().toString(36),
    board,
    players: colors.map((name, i) => ({
      id: i,
      name: name.trim().slice(0, 24) || `Jugador ${i + 1}`,
      color: PLAYER_COLORS[i],
      resources: emptyHand(),
      dev: [],
      knights: 0,
      ...(n === 2 && i >= 2 ? { neutral: true } : {}),
    })),
    duel:
      n === 2
        ? {
            tokens: [5, 5],
            supply: 10,
            rolls: [],
            spent: false,
            retiredKnight: false,
            neutralBuild: null,
            forcedTradeReturn: null,
          }
        : null,
    bank: emptyHand((expanded ? 24 : 19) * factor),
    deck,
    phase: "setupSettlement",
    current: first,
    primary: first,
    paired: false,
    turn: 0,
    round: 1,
    setupStep: 0,
    setupVertex: null,
    robber: board.tiles.find((t) => t.resource === "desert")!.id,
    dice: null,
    production: null,
    playedDev: false,
    returnPhase: "actions",
    freeRoads: 0,
    discardQueue: [],
    longest: null,
    army: null,
    roadLengths: Array(colors.length).fill(0),
    winner: null,
    trade: null,
    rng: seed >>> 0,
    distribution: Array(13).fill(0),
    log: [
      `${names[first]} comienza. Colocación en orden de ida y vuelta.`,
      `Sorteo inicial: ${names.map((name, i) => `${name} ${rolls[i]}`).join(" · ")}${rolls.filter((v) => v === Math.max(...rolls)).length > 1 ? " (empate resuelto con otra tirada)" : ""}.`,
    ],
  };
}
export function legalSettlements(
  g: Game,
  p = g.current,
  setup = g.phase === "setupSettlement",
): number[] {
  if (remaining(g, p).settlement <= 0) return [];
  return g.board.vertices
    .filter(
      (v) =>
        !v.building &&
        v.edges.every((id) => {
          const e = g.board.edges[id];
          return !g.board.vertices[e.a === v.id ? e.b : e.a].building;
        }) &&
        (setup || v.edges.some((id) => g.board.edges[id].owner === p)),
    )
    .map((v) => v.id);
}
export function legalCities(g: Game, p = g.current): number[] {
  return remaining(g, p).city > 0
    ? g.board.vertices
        .filter((v) => v.building?.owner === p && !v.building.city)
        .map((v) => v.id)
    : [];
}
export function legalRoads(
  g: Game,
  p = g.current,
  setup = g.phase === "setupRoad",
): number[] {
  if (remaining(g, p).road <= 0) return [];
  return g.board.edges
    .filter(
      (e) =>
        e.owner === undefined &&
        (setup
          ? e.a === g.setupVertex || e.b === g.setupVertex
          : [e.a, e.b].some((id) => {
              const v = g.board.vertices[id];
              return v.building
                ? v.building.owner === p
                : v.edges.some((i) => g.board.edges[i].owner === p);
            })),
    )
    .map((e) => e.id);
}
export function longestRoad(g: Game, p: number): number {
  const roads = g.board.edges.filter((e) => e.owner === p);
  let best = 0;
  const walk = (vertex: number, used: Set<number>) => {
    best = Math.max(best, used.size);
    if (
      used.size &&
      g.board.vertices[vertex].building &&
      g.board.vertices[vertex].building!.owner !== p
    )
      return;
    for (const id of g.board.vertices[vertex].edges) {
      const e = g.board.edges[id];
      if (e.owner !== p || used.has(id)) continue;
      used.add(id);
      walk(e.a === vertex ? e.b : e.a, used);
      used.delete(id);
    }
  };
  for (const id of new Set(roads.flatMap((e) => [e.a, e.b])))
    walk(id, new Set());
  return best;
}
function award(
  values: number[],
  min: number,
  current: number | null,
): number | null {
  const max = Math.max(...values);
  if (max < min) return null;
  const tied = values.flatMap((v, i) => (v === max ? [i] : []));
  return current !== null && tied.includes(current)
    ? current
    : tied.length === 1
      ? tied[0]
      : null;
}
export function refreshAwards(g: Game) {
  g.roadLengths = g.players.map((p) => longestRoad(g, p.id));
  const oldRoad = g.longest,
    oldArmy = g.army;
  g.longest = award(g.roadLengths, 5, g.longest);
  g.army = award(
    g.players.map((p) => p.knights),
    3,
    g.army,
  );
  if (g.longest !== oldRoad && g.longest !== null)
    message(
      g,
      `${g.players[g.longest].name} consigue la mayor ruta comercial (+2 puntos).`,
    );
  if (g.army !== oldArmy && g.army !== null)
    message(
      g,
      `${g.players[g.army].name} consigue el mayor ejército (+2 puntos).`,
    );
}
function victory(g: Game) {
  if (
    !["setupSettlement", "setupRoad"].includes(g.phase) &&
    points(g, g.current) >= 10
  ) {
    g.winner = g.current;
    g.phase = "finished";
    g.trade = null;
    message(
      g,
      `${g.players[g.current].name} gana con ${points(g, g.current)} puntos. ¡La isla tiene una nueva historia!`,
    );
  }
}
export function bankRate(g: Game, p: number, r: Resource): number {
  let rate = 4;
  for (const port of g.board.ports) {
    const e = g.board.edges[port.edge];
    if ([e.a, e.b].some((id) => g.board.vertices[id].building?.owner === p)) {
      if (port.resource === r) rate = 2;
      else if (port.resource === "any") rate = Math.min(rate, 3);
    }
  }
  return rate;
}
export function victims(g: Game): number[] {
  return [
    ...new Set(
      g.board.tiles[g.robber].vertices.flatMap((id) => {
        const b = g.board.vertices[id].building;
        return b && b.owner !== g.current && !g.players[b.owner].neutral
          ? [b.owner]
          : [];
      }),
    ),
  ];
}
export function actingPlayer(g: Game): number {
  return g.phase === "discard"
    ? g.discardQueue[0]
    : g.trade
      ? g.trade.proposer === g.current
        ? g.trade.with
        : g.current
      : g.current;
}
export function produce(g: Game, total: number) {
  const gains = g.players.map(() => emptyHand());
  const shortages: Resource[] = [];
  for (const r of RESOURCES) {
    const due = g.players.map((p) =>
      p.neutral
        ? 0
        : g.board.tiles
            .filter(
              (t) =>
                t.resource === r && t.number === total && t.id !== g.robber,
            )
            .reduce(
              (n, t) =>
                n +
                t.vertices.reduce((m, id) => {
                  const b = g.board.vertices[id].building;
                  return m + (b?.owner === p.id ? (b.city ? 2 : 1) : 0);
                }, 0),
              0,
            ),
    );
    const demand = due.reduce((a, b) => a + b, 0),
      people = due.filter((n) => n > 0).length;
    if (g.bank[r] < demand && people > 1) {
      shortages.push(r);
      message(
        g,
        `El banco no tiene suficiente ${NAMES[r].toLowerCase()}: nadie recibe ese recurso.`,
      );
      continue;
    }
    due.forEach((n, i) => {
      const amount = Math.min(n, g.bank[r]);
      g.bank[r] -= amount;
      g.players[i].resources[r] += amount;
      gains[i][r] += amount;
    });
  }
  return {
    gains,
    shortages,
    tiles: g.board.tiles
      .filter((t) => t.number === total && t.id !== g.robber)
      .map((t) => t.id),
  };
}
function resume(g: Game) {
  g.phase = g.returnPhase;
  g.freeRoads = 0;
}
function actionsPhase(g: Game) {
  insist(
    g.phase === "actions",
    "Primero completa la fase pendiente del turno.",
  );
}
function pay(g: Game, cost: Hand) {
  insist(
    canPay(g.players[g.current].resources, cost),
    "No tienes los recursos necesarios.",
  );
  transfer(g.players[g.current].resources, g.bank, cost);
}
function gainTokens(g: Game, p: number, amount: number) {
  if (!g.duel || !amount) return;
  const received = Math.min(amount, g.duel.supply);
  g.duel.supply -= received;
  g.duel.tokens[p] += received;
  message(g, `${g.players[p].name} recibe ${received} fichas de comercio.`);
}
function settlementTokens(g: Game, vertex: number) {
  if (!g.duel) return;
  const v = g.board.vertices[vertex];
  gainTokens(
    g,
    g.current,
    (v.tiles.some((id) => g.board.tiles[id].resource === "desert") ? 2 : 0) +
      (v.tiles.length < 3 ? 1 : 0),
  );
}
export function neutralOptions(g: Game, player: number): number[] {
  if (!g.players[player]?.neutral || !g.duel?.neutralBuild) return [];
  return g.duel.neutralBuild.kind === "settlement"
    ? legalSettlements(g, player, false)
    : legalRoads(g, player, false);
}
function requestNeutral(g: Game, kind: "road" | "settlement") {
  if (!g.duel) return;
  if (
    kind === "settlement" &&
    ![2, 3].some((id) => legalSettlements(g, id, false).length)
  )
    kind = "road";
  g.duel.neutralBuild = {
    kind,
    resume: g.phase as "roll" | "actions" | "freeRoads",
  };
  if (![2, 3].some((id) => neutralOptions(g, id).length)) {
    g.duel.neutralBuild = null;
    message(g, "Los colores neutrales no tienen construcciones disponibles.");
    return;
  }
  g.phase = "neutralBuild";
}
function drawRandom(g: Game, from: Hand, to: Hand) {
  let pick = Math.floor(nextRandom(g) * sum(from));
  for (const r of RESOURCES) {
    if (pick < from[r]) {
      from[r]--;
      to[r]++;
      return;
    }
    pick -= from[r];
  }
}
function spendTokens(g: Game) {
  insist(
    g.duel && ["roll", "actions"].includes(g.phase),
    "Usa las fichas antes de lanzar o durante las acciones del duelo.",
  );
  insist(!g.duel.spent, "Solo puedes gastar fichas en una acción por turno.");
  const cost = tokenCost(g, g.current);
  insist(
    g.duel.tokens[g.current] >= cost,
    `Necesitas ${cost} fichas de comercio.`,
  );
  g.duel.tokens[g.current] -= cost;
  g.duel.supply += cost;
  g.duel.spent = true;
}
export function applyAction(
  previous: Game,
  action: Action,
  actor: number,
): Game {
  insist(
    action && typeof action === "object" && typeof action.type === "string",
    "Acción inválida.",
  );
  insist(previous.phase !== "finished", "La partida ya ha terminado.");
  insist(
    previous.players[actor] && !previous.players[actor].neutral,
    "Jugador inválido.",
  );
  const g = structuredClone(previous),
    p = g.players[g.current];
  if (g.trade) {
    insist(
      ["acceptTrade", "declineTrade"].includes(action.type),
      "Primero resuelve la oferta de intercambio.",
    );
  }
  if (action.type === "discard")
    insist(actor === g.discardQueue[0], "Espera tu turno de descarte.");
  else if (action.type === "acceptTrade")
    insist(
      g.trade && actor === actingPlayer(g),
      "Solo la otra persona puede aceptar la oferta.",
    );
  else if (action.type === "offer")
    insist(
      actor === g.current || action.with === g.current,
      "Todo intercambio debe incluir a quien tiene el turno.",
    );
  else if (action.type === "declineTrade")
    insist(
      g.trade && (actor === g.current || actor === g.trade.with),
      "No participas en esta oferta.",
    );
  else insist(actor === g.current, "Es el turno de otra persona.");
  switch (action.type) {
    case "settlement": {
      const setup = g.phase === "setupSettlement";
      insist(
        setup || g.phase === "actions",
        "Ahora no puedes construir un poblado.",
      );
      insist(
        legalSettlements(g, g.current, setup).includes(action.id),
        "Respeta la distancia entre poblados y conecta con tu carretera.",
      );
      if (!setup) pay(g, COSTS.settlement);
      g.board.vertices[action.id].building = { owner: g.current, city: false };
      message(g, `${p.name} construye un poblado.`);
      settlementTokens(g, action.id);
      if (setup) {
        g.setupVertex = action.id;
        g.phase = "setupRoad";
        if (g.setupStep >= humanCount(g)) {
          for (const id of g.board.vertices[action.id].tiles) {
            const r = g.board.tiles[id].resource;
            if (r !== "desert" && g.bank[r] > 0) {
              g.bank[r]--;
              p.resources[r]++;
            }
          }
        }
      }
      if (!setup) requestNeutral(g, "settlement");
      refreshAwards(g);
      break;
    }
    case "road": {
      const setup = g.phase === "setupRoad",
        free = g.phase === "freeRoads";
      insist(
        setup || free || g.phase === "actions",
        "Ahora no puedes construir una carretera.",
      );
      insist(
        legalRoads(g, g.current, setup).includes(action.id),
        "La carretera debe conectar con tu red, sin atravesar un poblado rival.",
      );
      if (!setup && !free) pay(g, COSTS.road);
      g.board.edges[action.id].owner = g.current;
      message(
        g,
        `${p.name} construye una carretera${setup || free ? " gratuita" : ""}.`,
      );
      if (setup) {
        g.setupStep++;
        g.setupVertex = null;
        const n = humanCount(g);
        if (g.setupStep === n * 2) {
          g.current = g.primary;
          g.phase = "roll";
          g.turn = 1;
          message(g, "La isla está preparada. ¡Comienza la partida!");
        } else {
          const offset =
            g.setupStep < n ? g.setupStep : 2 * n - 1 - g.setupStep;
          g.current = (g.primary + offset) % n;
          g.phase = "setupSettlement";
        }
      }
      if (free) {
        g.freeRoads--;
        if (!g.freeRoads || !legalRoads(g, g.current, false).length) resume(g);
      }
      if (!setup) requestNeutral(g, "road");
      refreshAwards(g);
      break;
    }
    case "city":
      actionsPhase(g);
      insist(
        legalCities(g).includes(action.id),
        "Solo puedes mejorar uno de tus poblados y debes tener ciudades disponibles.",
      );
      pay(g, COSTS.city);
      g.board.vertices[action.id].building!.city = true;
      message(g, `${p.name} convierte un poblado en ciudad.`);
      break;
    case "roll": {
      insist(g.phase === "roll", "Ya se han lanzado los dados de este turno.");
      do {
        g.dice = [
          1 + Math.floor(nextRandom(g) * 6),
          1 + Math.floor(nextRandom(g) * 6),
        ];
      } while (g.duel?.rolls.includes(g.dice[0] + g.dice[1]));
      const total = g.dice[0] + g.dice[1];
      g.duel?.rolls.push(total);
      const nextPhase = g.duel && g.duel.rolls.length < 2 ? "roll" : "actions";
      g.distribution[total]++;
      message(g, `${p.name} lanza ${g.dice[0]} + ${g.dice[1]} = ${total}.`);
      if (total === 7) {
        g.production = {
          id: g.distribution.reduce((a, b) => a + b, 0),
          total,
          tiles: [],
          gains: g.players.map(() => emptyHand()),
          shortages: [],
        };
        g.returnPhase = nextPhase;
        g.discardQueue = g.players
          .filter((q) => sum(q.resources) > 7)
          .map((q) => q.id);
        g.phase = g.discardQueue.length ? "discard" : "robber";
      } else {
        g.production = {
          id: g.distribution.reduce((a, b) => a + b, 0),
          total,
          ...produce(g, total),
        };
        g.phase = nextPhase;
      }
      break;
    }
    case "discard": {
      insist(g.phase === "discard", "No hay descartes pendientes.");
      const who = g.players[actor];
      insist(validHand(action.resources), "Selecciona recursos válidos.");
      const needed = Math.floor(sum(who.resources) / 2);
      insist(
        sum(action.resources) === needed,
        `Debes descartar exactamente ${needed} cartas.`,
      );
      insist(
        canPay(who.resources, action.resources),
        "No puedes descartar cartas que no tienes.",
      );
      transfer(who.resources, g.bank, action.resources);
      g.discardQueue.shift();
      message(g, `${who.name} descarta ${needed} cartas.`);
      if (!g.discardQueue.length) g.phase = "robber";
      break;
    }
    case "robber":
      insist(g.phase === "robber", "Ahora no debes mover el ladrón.");
      insist(
        Number.isInteger(action.tile) &&
          g.board.tiles[action.tile] &&
          action.tile !== g.robber,
        "Mueve el ladrón a otro territorio.",
      );
      g.robber = action.tile;
      message(
        g,
        `${p.name} mueve el ladrón a ${NAMES[g.board.tiles[action.tile].resource].toLowerCase()}.`,
      );
      if (victims(g).length) g.phase = "steal";
      else resume(g);
      break;
    case "steal": {
      insist(
        g.phase === "steal" && victims(g).includes(action.player),
        "Elige un rival junto al ladrón.",
      );
      const victim = g.players[action.player];
      const hadCards = sum(victim.resources) > 0;
      let pick = Math.floor(nextRandom(g) * sum(victim.resources));
      for (const r of RESOURCES) {
        if (pick < victim.resources[r]) {
          victim.resources[r]--;
          p.resources[r]++;
          break;
        }
        pick -= victim.resources[r];
      }
      message(
        g,
        hadCards
          ? `${p.name} roba una carta a ${victim.name}.`
          : `${p.name} elige a ${victim.name}, que no tiene recursos para robar.`,
      );
      resume(g);
      break;
    }
    case "end": {
      actionsPhase(g);
      if (humanCount(g) > 4 && !g.paired) {
        g.paired = true;
        g.current =
          (g.primary + Math.floor(g.players.length / 2)) % g.players.length;
        g.phase = "actions";
        message(
          g,
          `Turno de pareja: ${g.players[g.current].name}. Puede construir, comerciar con el banco y jugar una carta.`,
        );
      } else {
        g.paired = false;
        g.primary = (g.primary + 1) % humanCount(g);
        g.current = g.primary;
        g.phase = "roll";
        g.round++;
        g.dice = null;
        message(g, `Turno de ${g.players[g.current].name}.`);
      }
      g.turn++;
      g.playedDev = false;
      if (g.duel) {
        g.duel.rolls = [];
        g.duel.spent = false;
        g.duel.retiredKnight = false;
      }
      break;
    }
    case "bank": {
      actionsPhase(g);
      insist(
        resource(action.give) &&
          resource(action.receive) &&
          action.give !== action.receive,
        "Elige dos recursos diferentes.",
      );
      insist(
        Number.isSafeInteger(action.quantity) &&
          action.quantity > 0 &&
          action.quantity <= 100,
        "Cantidad inválida.",
      );
      const rate = bankRate(g, g.current, action.give),
        cost = rate * action.quantity;
      insist(
        p.resources[action.give] >= cost,
        "No tienes suficientes cartas para ese intercambio.",
      );
      insist(
        g.bank[action.receive] >= action.quantity,
        "El banco no dispone de ese recurso.",
      );
      p.resources[action.give] -= cost;
      g.bank[action.give] += cost;
      p.resources[action.receive] += action.quantity;
      g.bank[action.receive] -= action.quantity;
      message(
        g,
        `${p.name} cambia ${cost} ${NAMES[action.give].toLowerCase()} por ${action.quantity} ${NAMES[action.receive].toLowerCase()} con el banco.`,
      );
      break;
    }
    case "offer":
      actionsPhase(g);
      insist(
        !g.paired,
        "En el turno de pareja solo puedes comerciar con el banco.",
      );
      insist(
        g.players[action.with] &&
          !g.players[action.with].neutral &&
          action.with !== actor,
        "Elige otro jugador.",
      );
      insist(
        validHand(action.give) && validHand(action.receive),
        "La oferta contiene cantidades inválidas.",
      );
      insist(
        sum(action.give) > 0 && sum(action.receive) > 0,
        "Ambas personas deben entregar recursos; no se permiten regalos.",
      );
      insist(
        RESOURCES.every((r) => !action.give[r] || !action.receive[r]),
        "No se puede ofrecer y pedir el mismo recurso.",
      );
      insist(
        canPay(g.players[actor].resources, action.give),
        "No tienes los recursos ofrecidos.",
      );
      g.trade = {
        with: actor === g.current ? action.with : actor,
        proposer: actor,
        give: actor === g.current ? action.give : action.receive,
        receive: actor === g.current ? action.receive : action.give,
      };
      message(
        g,
        `${g.players[actor].name} propone un intercambio a ${g.players[action.with].name}.`,
      );
      break;
    case "acceptTrade": {
      insist(g.trade && action.player === actor, "No hay una oferta para ti.");
      const other = g.players[g.trade.with];
      insist(
        canPay(p.resources, g.trade.give) &&
          canPay(other.resources, g.trade.receive),
        "Una de las personas no tiene los recursos acordados.",
      );
      transfer(p.resources, other.resources, g.trade.give);
      transfer(other.resources, p.resources, g.trade.receive);
      message(g, `${p.name} y ${other.name} completan el intercambio.`);
      g.trade = null;
      break;
    }
    case "declineTrade":
      insist(g.trade, "No hay una oferta pendiente.");
      message(g, "La oferta de intercambio se ha cerrado.");
      g.trade = null;
      break;
    case "buyDev":
      actionsPhase(g);
      insist(g.deck.length > 0, "No quedan cartas de desarrollo.");
      pay(g, COSTS.development);
      p.dev.push({ kind: g.deck.pop()!, bought: g.turn });
      message(g, `${p.name} compra una carta de desarrollo.`);
      break;
    case "playDev": {
      insist(
        ["roll", "actions"].includes(g.phase),
        "Resuelve primero la acción pendiente.",
      );
      insist(
        !g.playedDev,
        "Solo puedes jugar una carta de desarrollo por turno.",
      );
      const card = p.dev[action.index];
      insist(card, "Esa carta no existe.");
      insist(
        card.kind !== "victory",
        "Los puntos de victoria se revelan automáticamente al ganar.",
      );
      insist(
        card.bought < g.turn,
        "Esa carta se compró en este turno. Espera a tu siguiente turno.",
      );
      const kind = card.kind;
      g.returnPhase = g.phase as "roll" | "actions";
      if (kind === "plenty") {
        insist(
          Array.isArray(action.resources) &&
            action.resources.length === Math.min(2, sum(g.bank)) &&
            action.resources.every(resource),
          "Elige dos recursos disponibles (o los que queden en el banco).",
        );
        insist(action.resources.length > 0, "El banco está vacío.");
        const request = emptyHand();
        action.resources.forEach((r) => request[r]++);
        insist(
          canPay(g.bank, request),
          "El banco no dispone de esos recursos.",
        );
        transfer(g.bank, p.resources, request);
      }
      if (kind === "monopoly") {
        insist(
          Array.isArray(action.resources) &&
            action.resources.length === 1 &&
            resource(action.resources[0]),
          "Elige un recurso para el monopolio.",
        );
        const r = action.resources[0];
        let taken = 0;
        g.players.forEach((q) => {
          if (q.id !== g.current) {
            taken += q.resources[r];
            q.resources[r] = 0;
          }
        });
        p.resources[r] += taken;
        message(
          g,
          `${p.name} recibe ${taken} ${NAMES[r].toLowerCase()} por monopolio.`,
        );
      }
      if (kind === "roadBuilding") {
        insist(
          legalRoads(g, g.current, false).length > 0,
          "No tienes ninguna carretera disponible para construir.",
        );
        g.phase = "freeRoads";
        g.freeRoads = Math.min(2, remaining(g, g.current).road);
      }
      if (kind === "knight") {
        p.knights++;
        g.phase = "robber";
      }
      p.dev.splice(action.index, 1);
      g.playedDev = true;
      message(g, `${p.name} juega ${DEV_NAMES[kind]}.`);
      refreshAwards(g);
      break;
    }
    case "neutralBuild": {
      insist(
        g.phase === "neutralBuild" && g.duel?.neutralBuild,
        "No hay una construcción neutral pendiente.",
      );
      insist(
        neutralOptions(g, action.player).includes(action.id),
        "Elige una posición válida del color neutral.",
      );
      const pending = g.duel.neutralBuild;
      if (pending.kind === "road")
        g.board.edges[action.id].owner = action.player;
      else
        g.board.vertices[action.id].building = {
          owner: action.player,
          city: false,
        };
      message(
        g,
        `${p.name} coloca ${pending.kind === "road" ? "una carretera" : "un poblado"} para ${g.players[action.player].name}.`,
      );
      g.phase = pending.resume;
      g.duel.neutralBuild = null;
      if (g.phase === "freeRoads" && !legalRoads(g, g.current, false).length)
        resume(g);
      refreshAwards(g);
      break;
    }
    case "forceTrade": {
      insist(g.duel, "El comercio forzado solo está disponible en el duelo.");
      const other = g.players[1 - g.current];
      const take = Math.min(2, sum(other.resources));
      insist(take > 0, "Tu rival no tiene recursos para intercambiar.");
      insist(
        sum(p.resources) + take >= 2,
        "Debes poder devolver dos recursos después de robar.",
      );
      spendTokens(g);
      for (let i = 0; i < take; i++)
        drawRandom(g, other.resources, p.resources);
      g.duel.forcedTradeReturn = g.phase as "roll" | "actions";
      g.phase = "forcedTrade";
      message(
        g,
        `${p.name} toma ${take} recursos al azar. Debe devolver dos a ${other.name}.`,
      );
      break;
    }
    case "returnTrade": {
      insist(
        g.phase === "forcedTrade" && g.duel?.forcedTradeReturn,
        "No hay comercio forzado pendiente.",
      );
      insist(
        validHand(action.resources) &&
          sum(action.resources) === 2 &&
          canPay(p.resources, action.resources),
        "Elige exactamente dos recursos de tu mano.",
      );
      transfer(
        p.resources,
        g.players[1 - g.current].resources,
        action.resources,
      );
      g.phase = g.duel.forcedTradeReturn;
      g.duel.forcedTradeReturn = null;
      message(
        g,
        `${p.name} devuelve dos recursos y completa el comercio forzado.`,
      );
      break;
    }
    case "chaseRobber":
      insist(
        g.board.tiles[g.robber].resource !== "desert",
        "El ladrón ya está en el desierto.",
      );
      spendTokens(g);
      g.robber = g.board.tiles.find((t) => t.resource === "desert")!.id;
      message(
        g,
        `${p.name} usa fichas para devolver el ladrón al desierto, sin robar.`,
      );
      break;
    case "retireKnight":
      insist(
        g.duel && ["roll", "actions"].includes(g.phase),
        "Retira caballeros durante tu turno de duelo, sin acciones pendientes.",
      );
      insist(
        !g.duel.retiredKnight && p.knights > 0 && g.duel.supply > 0,
        "Necesitas un caballero jugado, fichas en la reserva y no haber retirado otro este turno.",
      );
      p.knights--;
      g.duel.retiredKnight = true;
      gainTokens(g, g.current, 2);
      if (g.army === g.current && p.knights <= g.players[1 - g.current].knights)
        g.army = null;
      refreshAwards(g);
      message(g, `${p.name} retira un caballero de su ejército.`);
      break;
    default:
      throw new Error("Acción desconocida.");
  }
  victory(g);
  return g;
}
