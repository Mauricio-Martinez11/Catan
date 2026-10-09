import { it, expect } from "vitest";
import { createGame, applyAction, actingPlayer, victims } from "./engine";
import { emptyHand } from "./types";
it("Un rival puede proponer un trato al jugador activo; el activo debe aceptar", () => {
  let g = createGame(["a", "b", "c", "d"], 481);
  g.current = 0;
  g.phase = "actions";
  g.players[0].resources = { ...emptyHand(), wood: 2 };
  g.players[1].resources = { ...emptyHand(), ore: 1 };
  g = applyAction(
    g,
    {
      type: "offer",
      with: 0,
      give: { ...emptyHand(), ore: 1 },
      receive: { ...emptyHand(), wood: 2 },
    },
    1,
  );
  expect(g.trade?.proposer).toBe(1);
  expect(actingPlayer(g)).toBe(0);
  expect(g.trade?.give.wood).toBe(2);
  expect(() => applyAction(g, { type: "acceptTrade", player: 1 }, 1)).toThrow();
  g = applyAction(g, { type: "acceptTrade", player: 0 }, 0);
  expect(g.players[0].resources).toEqual({ ...emptyHand(), ore: 1 });
  expect(g.players[1].resources).toEqual({ ...emptyHand(), wood: 2 });
});
it("Dos jugadores inactivos no pueden comerciar entre sí", () => {
  const g = createGame(["a", "b", "c", "d"], 2);
  g.current = 0;
  g.phase = "actions";
  expect(() =>
    applyAction(
      g,
      {
        type: "offer",
        with: 2,
        give: { ...emptyHand(), wood: 1 },
        receive: { ...emptyHand(), ore: 1 },
      },
      1,
    ),
  ).toThrow("tiene el turno");
});
it("Se permite elegir una víctima adyacente sin recursos y no se roba ninguna carta", () => {
  let g = createGame(["a", "b", "c", "d"], 2);
  g.current = 0;
  g.phase = "robber";
  const tile = g.board.tiles.find((t) => t.id !== g.robber)!;
  g.board.vertices[tile.vertices[0]].building = { owner: 1, city: false };
  g = applyAction(g, { type: "robber", tile: tile.id }, 0);
  expect(victims(g)).toEqual([1]);
  g = applyAction(g, { type: "steal", player: 1 }, 0);
  expect(g.phase).toBe("actions");
  expect(g.players[0].resources).toEqual(emptyHand());
});
