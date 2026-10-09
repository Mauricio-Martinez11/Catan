import { createServer } from "node:http";
import { networkInterfaces } from "node:os";
import { randomBytes, randomInt } from "node:crypto";
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve, extname } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import { createGame, applyAction, sum } from "../src/game/engine";
import { emptyHand, PLAYER_COLORS } from "../src/game/types";
import type { Action, Count, Game, TurnClock } from "../src/game/types";
import { advanceClock, expireClock, startClock } from "./timing";
export interface Seat {
  id: number;
  name: string;
  token: string;
  sockets: Set<WebSocket>;
}
export interface Room {
  code: string;
  host: number;
  count: Count;
  seed: number;
  seats: Seat[];
  game: Game | null;
  updated: number;
  revision: number;
  clock: TurnClock | null;
}
export const rooms = new Map<string, Room>();
export function publicGame(g: Game, viewer: number) {
  return {
    ...g,
    rng: 0,
    deck: [],
    deckCount: g.deck.length,
    players: g.players.map((p) => ({
      ...p,
      resourceCount: sum(p.resources),
      devCount: p.dev.length,
      resources: p.id === viewer ? p.resources : emptyHand(),
      dev: p.id === viewer || g.phase === "finished" ? p.dev : [],
    })),
  };
}
const port = Number(process.env.PORT) || 3001;
const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".json": "application/json",
};
const server = createServer((req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.url === "/api/network") {
    const addresses = Object.values(networkInterfaces()).flatMap((list) =>
      (list || [])
        .filter((n) => n.family === "IPv4" && !n.internal)
        .map((n) => n.address),
    );
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        addresses,
        port: process.env.NODE_ENV === "production" ? port : 5173,
      }),
    );
    return;
  }
  if (req.url === "/api/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  const root = resolve("dist");
  let path: string;
  try {
    path = resolve(
      root,
      "." + decodeURIComponent((req.url || "/").split("?")[0]),
    );
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (
    path !== root &&
    !path.startsWith(
      root + "/".replace("/", process.platform === "win32" ? "\\" : "/"),
    )
  ) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (!existsSync(path) || !statSync(path).isFile())
    path = resolve(root, "index.html");
  if (existsSync(path)) {
    res.setHeader(
      "Content-Type",
      types[extname(path)] || "application/octet-stream",
    );
    createReadStream(path).pipe(res);
  } else {
    res.writeHead(404);
    res.end("Inicia npm run dev para abrir la mesa.");
  }
});
const wss = new WebSocketServer({ server, path: "/ws", maxPayload: 16384 });
function send(ws: WebSocket, data: unknown) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function snapshot(room: Room, seat: Seat) {
  return {
    type: "state",
    serverNow: Date.now(),
    you: seat.id,
    room: {
      code: room.code,
      host: room.host,
      count: room.count,
      seed: room.game ? undefined : room.seed,
      revision: room.revision,
      clock: room.clock,
      seats: room.seats.map((s) => ({
        id: s.id,
        name: s.name,
        color: PLAYER_COLORS[s.id],
        online: s.sockets.size > 0,
      })),
    },
    game: room.game ? publicGame(room.game, seat.id) : null,
  };
}
function broadcast(room: Room, touch = true) {
  if (touch) room.updated = Date.now();
  room.seats.forEach((s) =>
    s.sockets.forEach((ws) => send(ws, snapshot(room, s))),
  );
}
function tickRoom(room: Room, now: number) {
  if (!room.game || !room.clock || room.clock.deadline > now) return;
  const result = expireClock(
    room.game,
    room.clock,
    now,
    () => randomInt(0, 4294967296) / 4294967296,
  );
  if (!result.changed) return;
  room.game = result.game;
  room.clock = result.clock;
  room.revision++;
  broadcast(room, false);
}
export function runTimers(now = Date.now()) {
  for (const room of rooms.values()) tickRoom(room, now);
}
function requireName(value: unknown): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > 24)
    throw new Error("Escribe un nombre de entre 1 y 24 caracteres.");
  return value.trim();
}
function find(code: unknown): Room {
  if (typeof code !== "string") throw new Error("Código de sala inválido.");
  const r = rooms.get(code.toUpperCase());
  if (!r) throw new Error("La sala no existe o el servidor se ha reiniciado.");
  return r;
}
wss.on("connection", (ws, req) => {
  // Same-origin browser connections. Non-browser clients still need seat credentials.
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        ws.close(1008, "Origen no permitido");
        return;
      }
    } catch {
      ws.close(1008);
      return;
    }
  }
  let binding: { room: Room; seat: Seat } | null = null;
  let windowStart = Date.now(),
    messages = 0;
  ws.on("message", (raw) => {
    try {
      if (Date.now() - windowStart > 1000) {
        windowStart = Date.now();
        messages = 0;
      }
      if (++messages > 30)
        throw new Error("Demasiadas acciones. Espera un momento.");
      const data = JSON.parse(raw.toString());
      if (!data || typeof data !== "object")
        throw new Error("Mensaje inválido.");
      if (
        data.type === "create" ||
        data.type === "join" ||
        data.type === "resume"
      ) {
        if (binding) throw new Error("Ya estás en una sala.");
        let room: Room, seat: Seat;
        if (data.type === "create") {
          if (![2, 4, 6, 8, 10].includes(data.count))
            throw new Error("Cantidad de jugadores inválida.");
          if (rooms.size >= 100)
            throw new Error("El servidor ha alcanzado el límite de salas.");
          const name = requireName(data.name);
          let code: string;
          do {
            code = randomBytes(4).toString("hex").slice(0, 6).toUpperCase();
          } while (rooms.has(code));
          room = {
            code,
            host: 0,
            count: data.count,
            seed: randomInt(1, 2147483647),
            seats: [],
            game: null,
            updated: Date.now(),
            revision: 0,
            clock: null,
          };
          rooms.set(code, room);
          seat = {
            id: 0,
            name,
            token: randomBytes(24).toString("hex"),
            sockets: new Set(),
          };
          room.seats.push(seat);
        } else {
          room = find(data.code);
          if (data.type === "resume") {
            seat = room.seats.find(
              (s) => typeof data.token === "string" && s.token === data.token,
            )!;
            if (!seat)
              throw new Error(
                "La sesión ha caducado. Únete a una sala de nuevo.",
              );
          } else {
            if (room.game)
              throw new Error(
                "Esta partida ya comenzó. Usa el dispositivo con el que te uniste.",
              );
            if (room.seats.length >= room.count)
              throw new Error("La sala está llena.");
            const name = requireName(data.name);
            if (
              room.seats.some(
                (s) => s.name.toLowerCase() === name.toLowerCase(),
              )
            )
              throw new Error("Ese nombre ya está en la sala.");
            seat = {
              id: room.seats.length,
              name,
              token: randomBytes(24).toString("hex"),
              sockets: new Set(),
            };
            room.seats.push(seat);
          }
        }
        binding = { room, seat };
        seat.sockets.add(ws);
        send(ws, { type: "session", code: room.code, token: seat.token });
        broadcast(room);
        return;
      }
      if (!binding) throw new Error("Primero entra a una sala.");
      const { room, seat } = binding;
      if (data.type === "start") {
        if (seat.id !== room.host)
          throw new Error("Solo el anfitrión puede comenzar.");
        if (room.game) throw new Error("La partida ya comenzó.");
        if (
          room.seats.length !== room.count ||
          room.seats.some((s) => !s.sockets.size)
        )
          throw new Error("Espera a que todos los jugadores estén conectados.");
        room.game = createGame(
          room.seats.map((s) => s.name),
          randomInt(1, 2147483647),
          room.seed,
          () => randomInt(0, 4294967296) / 4294967296,
        );
        room.revision++;
        room.clock = startClock(room.game, Date.now());
      } else if (data.type === "action") {
        if (!room.game) throw new Error("La partida aún no ha comenzado.");
        tickRoom(room, Date.now());
        if (data.revision !== room.revision)
          throw new Error(
            "El turno cambió. Revisa la mesa y vuelve a intentarlo.",
          );
        const prior = { ...room.game, rng: randomInt(1, 2147483647) };
        room.game = applyAction(prior, data.action as Action, seat.id);
        room.clock = advanceClock(prior, room.game, room.clock, Date.now());
        room.revision++;
      } else if (data.type === "rematch") {
        if (seat.id !== room.host || room.game?.phase !== "finished")
          throw new Error(
            "Solo puedes preparar otra partida después de terminar esta.",
          );
        room.game = null;
        room.clock = null;
        room.seed = randomInt(1, 2147483647);
        room.revision++;
      } else if (data.type === "leave") {
        if (room.game)
          throw new Error(
            "Puedes cerrar la página y reconectarte a la partida.",
          );
        if (seat.sockets.size > 1)
          throw new Error(
            "Cierra las otras pestañas de esta sesión antes de salir.",
          );
        room.seats.splice(seat.id, 1);
        room.seats.forEach((s, i) => (s.id = i));
        room.host = 0;
        seat.sockets.delete(ws);
        binding = null;
        send(ws, { type: "left" });
        if (!room.seats.length) rooms.delete(room.code);
      } else throw new Error("Acción desconocida.");
      broadcast(room);
    } catch (error) {
      send(ws, {
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "No se pudo realizar la acción.",
      });
    }
  });
  ws.on("close", () => {
    if (binding) {
      binding.seat.sockets.delete(ws);
      broadcast(binding.room);
    }
  });
  ws.on("error", () => {});
});
const cleanup = setInterval(() => {
  for (const [code, room] of rooms)
    if (
      !room.seats.some((s) => s.sockets.size) &&
      Date.now() - room.updated > 24 * 3600 * 1000
    )
      rooms.delete(code);
}, 60000);
cleanup.unref();
const ticker = setInterval(runTimers, 250);
ticker.unref();
server.on("close", () => {
  clearInterval(ticker);
  clearInterval(cleanup);
});
if (process.env.VITEST !== "true") {
  server.listen(port, "0.0.0.0", () =>
    console.log(
      `Servidor de partidas: http://localhost:${port} (salas en memoria)`,
    ),
  );
}
export { server, wss };
