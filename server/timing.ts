import {
  applyAction,
  actingPlayer,
  legalRoads,
  legalSettlements,
  neutralOptions,
  sum,
  victims,
} from "../src/game/engine";
import { emptyHand, RESOURCES } from "../src/game/types";
import type { Action, Game, TurnClock } from "../src/game/types";

export const TURN_MS = 90_000;
export const ROBBER_MS = 30_000;
const robberPhase = (g: Game) =>
  ["discard", "robber", "steal"].includes(g.phase);

export function startClock(g: Game, now: number): TurnClock | null {
  if (g.phase === "finished") return null;
  const kind = g.phase.startsWith("setup")
    ? "setup"
    : g.phase === "discard"
      ? "discard"
      : robberPhase(g)
        ? "robber"
        : "turn";
  const duration = robberPhase(g) ? ROBBER_MS : TURN_MS;
  return {
    kind,
    player: g.phase === "discard" ? g.discardQueue[0] : g.current,
    deadline: now + duration,
    duration,
    remainingTurnMs: TURN_MS,
  };
}

/** Actions and offers never renew a turn. Mandatory robber decisions pause it. */
export function advanceClock(
  before: Game,
  after: Game,
  clock: TurnClock | null,
  now: number,
): TurnClock | null {
  if (after.phase === "finished") return null;
  if (
    !clock ||
    before.turn !== after.turn ||
    before.setupStep !== after.setupStep
  )
    return startClock(after, now);
  const wasRobber = robberPhase(before),
    isRobber = robberPhase(after);
  if (isRobber) {
    const player =
      after.phase === "discard" ? after.discardQueue[0] : after.current;
    const kind = after.phase === "discard" ? "discard" : "robber";
    if (wasRobber && clock.player === player && clock.kind === kind)
      return clock;
    return {
      kind,
      player,
      duration: ROBBER_MS,
      deadline: now + ROBBER_MS,
      remainingTurnMs: wasRobber
        ? clock.remainingTurnMs
        : Math.max(0, clock.deadline - now),
    };
  }
  if (wasRobber)
    return {
      kind: "turn",
      player: after.current,
      duration: TURN_MS,
      deadline: now + clock.remainingTurnMs,
      remainingTurnMs: clock.remainingTurnMs,
    };
  return clock;
}

function pick<T>(items: T[], rng: () => number): T {
  if (!items.length) throw new Error("No hay una decisión automática válida.");
  return items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
}
/** Only obligatory decisions are automated; no paid construction or accepted trades. */
export function timeoutAction(
  g: Game,
  rng: () => number,
): { action: Action; actor: number } {
  const actor = actingPlayer(g);
  if (g.trade) return { actor: g.current, action: { type: "declineTrade" } };
  if (g.phase === "setupSettlement")
    return {
      actor,
      action: { type: "settlement", id: pick(legalSettlements(g), rng) },
    };
  if (g.phase === "setupRoad" || g.phase === "freeRoads")
    return { actor, action: { type: "road", id: pick(legalRoads(g), rng) } };
  if (g.phase === "roll") return { actor, action: { type: "roll" } };
  if (g.phase === "actions") return { actor, action: { type: "end" } };
  if (g.phase === "robber")
    return {
      actor,
      action: {
        type: "robber",
        tile: pick(
          g.board.tiles.filter((t) => t.id !== g.robber),
          rng,
        ).id,
      },
    };
  if (g.phase === "steal")
    return { actor, action: { type: "steal", player: pick(victims(g), rng) } };
  if (g.phase === "neutralBuild") {
    const player = pick(
      [2, 3].filter((p) => neutralOptions(g, p).length),
      rng,
    );
    return {
      actor,
      action: {
        type: "neutralBuild",
        player,
        id: pick(neutralOptions(g, player), rng),
      },
    };
  }
  if (g.phase === "discard" || g.phase === "forcedTrade") {
    const resources = emptyHand(),
      hand = { ...g.players[actor].resources };
    const total = g.phase === "discard" ? Math.floor(sum(hand) / 2) : 2;
    for (let n = 0; n < total; n++) {
      const cards = RESOURCES.flatMap((r) => Array<typeof r>(hand[r]).fill(r));
      const r = pick(cards, rng);
      resources[r]++;
      hand[r]--;
    }
    return {
      actor,
      action:
        g.phase === "discard"
          ? { type: "discard", resources }
          : { type: "returnTrade", resources },
    };
  }
  throw new Error("La partida ya está terminada.");
}

export function expireClock(
  g: Game,
  clock: TurnClock,
  now: number,
  rng: () => number,
): { game: Game; clock: TurnClock | null; changed: boolean } {
  if (g.phase === "finished" || now < clock.deadline)
    return { game: g, clock, changed: false };
  let game = g,
    nextClock: TurnClock | null = clock;
  // At most a pair of production rolls, an unfinished card and an end action.
  // A new timed decision (discard/robber/new player) stops this loop immediately.
  for (let n = 0; n < 32 && nextClock && nextClock.deadline <= now; n++) {
    const { action, actor } = timeoutAction(game, rng);
    const before = game;
    game = applyAction(
      { ...game, rng: Math.floor(rng() * 2147483646) + 1 },
      action,
      actor,
    );
    nextClock = advanceClock(before, game, nextClock, now);
  }
  game.log.unshift(
    `Tiempo agotado de ${g.players[clock.player].name}: decisiones pendientes resueltas automáticamente.`,
  );
  game.log = game.log.slice(0, 120);
  return { game, clock: nextClock, changed: true };
}
