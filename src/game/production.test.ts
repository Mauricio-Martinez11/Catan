import { expect, it } from "vitest";
import { createGame, produce } from "./engine";

function fixture() {
  const g = createGame(["a", "b", "c", "d"], 80);
  g.board.tiles.forEach((t) => (t.number = 0));
  const tile = g.board.tiles.find((t) => t.resource === "wood")!;
  tile.number = 6;
  g.board.vertices[tile.vertices[0]].building = { owner: 0, city: false };
  g.board.vertices[tile.vertices[2]].building = { owner: 1, city: true };
  return { g, tile };
}
it("El resumen refleja las cartas entregadas automáticamente: una por poblado y dos por ciudad", () => {
  const { g, tile } = fixture(),
    result = produce(g, 6);
  expect(result.tiles).toEqual([tile.id]);
  expect(result.gains.map((h) => h.wood)).toEqual([1, 2, 0, 0]);
  expect(g.players.map((p) => p.resources.wood)).toEqual([1, 2, 0, 0]);
  expect(g.bank.wood).toBe(16);
});
it("El terreno bloqueado no se ilumina ni entrega cartas", () => {
  const { g, tile } = fixture();
  g.robber = tile.id;
  const result = produce(g, 6);
  expect(result.tiles).toEqual([]);
  expect(result.gains.every((h) => h.wood === 0)).toBe(true);
  expect(g.bank.wood).toBe(19);
});
it("El resumen comunica escasez sin prometer cartas que el banco no entregó", () => {
  const { g } = fixture();
  g.bank.wood = 2;
  const result = produce(g, 6);
  expect(result.shortages).toContain("wood");
  expect(result.gains.every((h) => h.wood === 0)).toBe(true);
  expect(g.bank.wood).toBe(2);
});
it("Si solo cobra un jugador, el resumen muestra la cantidad disponible", () => {
  const { g, tile } = fixture();
  g.bank.wood = 1;
  delete g.board.vertices[tile.vertices[0]].building;
  const result = produce(g, 6);
  expect(result.gains[1].wood).toBe(1);
  expect(g.players[1].resources.wood).toBe(1);
  expect(g.bank.wood).toBe(0);
});
