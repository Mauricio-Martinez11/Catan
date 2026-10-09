import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { WebSocket } from "ws";
import { server, wss, rooms, publicGame, runTimers } from "./index";
import {
  createGame,
  legalSettlements,
  legalRoads,
  sum,
} from "../src/game/engine";
import { emptyHand } from "../src/game/types";
import type { Game, Action } from "../src/game/types";
let url = "";
const clients: Client[] = [];
class Client {
  ws: WebSocket;
  state: any = null;
  session: any = null;
  queue: any[] = [];
  listeners: (() => void)[] = [];
  constructor() {
    this.ws = new WebSocket(url);
    this.ws.on("message", (data) => {
      const m = JSON.parse(data.toString());
      this.queue.push(m);
      if (m.type === "state") this.state = m;
      if (m.type === "session") this.session = m;
      this.listeners.forEach((f) => f());
    });
    clients.push(this);
  }
  async open() {
    await new Promise<void>((ok, fail) => {
      this.ws.once("open", ok);
      this.ws.once("error", fail);
    });
    return this;
  }
  async receive(predicate: (m: any) => boolean) {
    const read = () => {
      const i = this.queue.findIndex(predicate);
      return i < 0 ? undefined : this.queue.splice(i, 1)[0];
    };
    const old = read();
    if (old) return old;
    return await new Promise<any>((ok, fail) => {
      const check = () => {
        const m = read();
        if (m) {
          clearTimeout(timeout);
          this.listeners = this.listeners.filter((f) => f !== check);
          ok(m);
        }
      };
      const timeout = setTimeout(() => {
        this.listeners = this.listeners.filter((f) => f !== check);
        fail(new Error("Timeout esperando respuesta de sala"));
      }, 4000);
      this.listeners.push(check);
    });
  }
  async send(
    data: object,
    predicate: (m: any) => boolean = (m) => m.type === "state",
  ) {
    this.queue = [];
    this.ws.send(JSON.stringify(data));
    return this.receive(predicate);
  }
}
beforeAll(async () => {
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  url = `ws://127.0.0.1:${(server.address() as { port: number }).port}/ws`;
});
afterAll(async () => {
  clients.forEach((c) => c.ws.terminate());
  await new Promise<void>((ok) => wss.close(() => ok()));
  await new Promise<void>((ok) => server.close(() => ok()));
});
describe("Salas reales por WebSocket", () => {
  it.each([2, 4, 6, 8, 10])(
    "Sincroniza preparación y dados entre %i conexiones independientes",
    async (n) => {
      const c: Client[] = [];
      for (let i = 0; i < n; i++) c.push(await new Client().open());
      let result = await c[0].send({
        type: "create",
        name: "Anfitrión",
        count: n,
      });
      const code = result.room.code;
      for (let i = 1; i < n; i++)
        await c[i].send({ type: "join", code, name: `Amigo ${i}` });
      const denied = await c[1].send(
        { type: "start" },
        (m) => m.type === "error",
      );
      expect(denied.message).toContain("anfitrión");
      result = await c[0].send(
        { type: "start" },
        (m) => m.type === "state" && !!m.game,
      );
      expect(result.game.players.filter((p: any) => !p.neutral)).toHaveLength(
        n,
      );
      expect(result.room.seats).toHaveLength(n);
      expect(result.room.clock.duration).toBe(90000);
      expect(result.serverNow).toBeGreaterThan(0);
      if (n === 2) {
        expect(result.game.duel).not.toBeNull();
        expect(result.game.players.filter((p: any) => p.neutral)).toHaveLength(
          2,
        );
      }
      let g: Game = rooms.get(code)!.game!;
      while (g.phase.startsWith("setup")) {
        const revision = rooms.get(code)!.revision,
          actor = g.current;
        const action: Action =
          g.phase === "setupSettlement"
            ? { type: "settlement", id: legalSettlements(g)[0] }
            : { type: "road", id: legalRoads(g)[0] };
        result = await c[actor].send(
          { type: "action", action, revision },
          (m) => m.type === "state" && m.room.revision === revision + 1,
        );
        g = rooms.get(code)!.game!;
        expect(
          result.game.board.vertices.filter((v: any) => v.building).length,
        ).toBe(g.board.vertices.filter((v) => v.building).length);
      }
      expect(g.phase).toBe("roll");
      const actor = g.current,
        revision = rooms.get(code)!.revision;
      const deniedTurn = await c[(actor + 1) % n].send(
        { type: "action", revision, action: { type: "roll" } },
        (m) => m.type === "error",
      );
      expect(deniedTurn.message).toContain("turno");
      result = await c[actor].send(
        { type: "action", revision, action: { type: "roll" } },
        (m) => m.type === "state" && m.room.revision === revision + 1,
      );
      expect(result.game.dice).toHaveLength(2);
      for (let i = 0; i < n; i++) {
        const state =
          i === actor
            ? result
            : await c[i]
                .receive(
                  (m) => m.type === "state" && m.room.revision === revision + 1,
                )
                .catch(() => c[i].state);
        expect(state.game.dice).toEqual(result.game.dice);
        for (const p of state.game.players)
          if (p.id !== i) {
            expect(sum(p.resources)).toBe(0);
            expect(p.dev).toEqual([]);
          }
      }
      const stale = await c[actor].send(
        { type: "action", revision, action: { type: "end" } },
        (m) => m.type === "error",
      );
      expect(stale.message).toContain("turno cambió");
      const saved = c[0].session;
      expect(saved.token).toHaveLength(48);
      c[0].ws.close();
      const reconnect = await new Client().open();
      const resumed = await reconnect.send({
        type: "resume",
        code,
        token: saved.token,
      });
      expect(resumed.you).toBe(0);
      expect(resumed.room.code).toBe(code);
      expect(resumed.game.board).toEqual(result.game.board);
      for (const x of [...c, reconnect]) x.ws.close();
    },
    15000,
  );
  it("La vista pública nunca expone mazo, manos ajenas, semilla o puntos secretos", () => {
    const g = createGame(["a", "b", "c", "d"], 987654);
    g.players[1].resources.ore = 4;
    g.players[1].dev = [{ kind: "victory", bought: 0 }];
    g.players[0].resources.wood = 3;
    const publicState = publicGame(g, 0);
    expect(publicState.players[0].resources.wood).toBe(3);
    expect(publicState.players[1].resources).toEqual(emptyHand());
    expect(publicState.players[1].dev).toEqual([]);
    expect(publicState.players[1].devCount).toBe(1);
    expect(publicState.players[1].resourceCount).toBe(4);
    expect(publicState.rng).toBe(0);
    expect(publicState.id).not.toContain("987654");
    expect(publicState.deck).toEqual([]);
    expect(publicState.deckCount).toBe(25);
  });
  it("El servidor avanza al vencer el tiempo y la reconexión conserva el mismo límite", async () => {
    const a = await new Client().open(),
      b = await new Client().open();
    const created = await a.send({ type: "create", name: "Reloj A", count: 2 });
    await b.send({ type: "join", name: "Reloj B", code: created.room.code });
    const started = await a.send(
      { type: "start" },
      (m) => m.type === "state" && !!m.game,
    );
    const room = rooms.get(created.room.code)!;
    room.clock!.deadline = Date.now() - 1;
    const oldRevision = room.revision;
    runTimers();
    const expired = await b.receive(
      (m) => m.type === "state" && m.room.revision === oldRevision + 1,
    );
    expect(expired.game.setupStep).toBe(1);
    expect(expired.game.current).not.toBe(started.game.current);
    expect(expired.room.clock.duration).toBe(90000);
    const resume = await new Client().open();
    const restored = await resume.send({
      type: "resume",
      code: created.room.code,
      token: a.session.token,
    });
    expect(restored.room.clock.deadline).toBe(expired.room.clock.deadline);
    const rejected = await a.send(
      {
        type: "action",
        revision: oldRevision,
        action: { type: "roll" },
        deadline: Date.now() + 1000000,
      },
      (m) => m.type === "error",
    );
    expect(rejected.message).toContain("turno cambió");
    a.ws.close();
    b.ws.close();
    resume.ws.close();
  });
  it("Rechaza credenciales inventadas y salas inexistentes", async () => {
    const c = await new Client().open();
    const e = await c.send(
      { type: "resume", code: "ZZZZZZ", token: "incorrecto" },
      (m) => m.type === "error",
    );
    expect(e.message).toContain("no existe");
    c.ws.close();
  });
});
