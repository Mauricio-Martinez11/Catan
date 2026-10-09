import type { Board, Count, Terrain } from "./types";
export function random(seed: number) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeBoard(count: Count, seed: number): Board {
  const rng = random(seed);
  const rows =
    count <= 4
      ? [3, 4, 5, 4, 3]
      : count === 6
        ? [3, 4, 5, 6, 5, 4, 3]
        : count === 8
          ? [4, 5, 6, 7, 6, 5, 4]
          : [4, 5, 6, 7, 8, 7, 6, 5, 4];
  const size = 48,
    w = Math.sqrt(3) * size,
    margin = 85,
    max = Math.max(...rows);
  const total = rows.reduce((a, b) => a + b, 0);
  const quantities =
    count <= 4
      ? [4, 3, 4, 4, 3, 1]
      : count === 6
        ? [6, 5, 6, 6, 5, 2]
        : count === 8
          ? [8, 6, 7, 8, 6, 2]
          : [11, 10, 11, 10, 8, 2];
  const kinds: Terrain[] = ["wood", "brick", "wool", "grain", "ore", "desert"];
  const terrains = shuffle(
    kinds.flatMap((k, i) => Array<Terrain>(quantities[i]).fill(k)),
    rng,
  );
  const b: Board = {
    tiles: [],
    vertices: [],
    edges: [],
    ports: [],
    width: w * max + margin * 2,
    height: size * 1.5 * (rows.length - 1) + size * 2 + margin * 2,
  };
  const vm = new Map<string, number>(),
    em = new Map<string, number>();
  rows.forEach((len, row) => {
    for (let col = 0; col < len; col++) {
      const id = b.tiles.length,
        x = margin + w / 2 + ((max - len) * w) / 2 + col * w,
        y = margin + size + row * size * 1.5;
      const vertices: number[] = [];
      for (let k = 0; k < 6; k++) {
        const a = ((60 * k - 30) * Math.PI) / 180,
          vx = x + size * Math.cos(a),
          vy = y + size * Math.sin(a),
          key = `${vx.toFixed(3)},${vy.toFixed(3)}`;
        let v = vm.get(key);
        if (v === undefined) {
          v = b.vertices.length;
          vm.set(key, v);
          b.vertices.push({ id: v, x: vx, y: vy, tiles: [], edges: [] });
        }
        b.vertices[v].tiles.push(id);
        vertices.push(v);
      }
      for (let k = 0; k < 6; k++) {
        const a = vertices[k],
          c = vertices[(k + 1) % 6],
          key = [a, c].sort((u, v) => u - v).join(":");
        let e = em.get(key);
        if (e === undefined) {
          e = b.edges.length;
          em.set(key, e);
          b.edges.push({ id: e, a, b: c, tiles: [] });
          b.vertices[a].edges.push(e);
          b.vertices[c].edges.push(e);
        }
        b.edges[e].tiles.push(id);
      }
      b.tiles.push({ id, x, y, resource: terrains[id], number: 0, vertices });
    }
  });
  if (b.tiles.length !== total || terrains.length !== total)
    throw new Error("Configuración del tablero inválida");
  const baseNumbers = [
    2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  ];
  const sixNumbers = [
    2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6, 8, 8, 8, 9, 9, 9, 10, 10, 10, 11,
    11, 11, 12, 12,
  ];
  const fertile = b.tiles.filter((t) => t.resource !== "desert");
  let nums =
    count <= 4
      ? baseNumbers
      : count === 6
        ? sixNumbers
        : Array.from(
            { length: fertile.length },
            (_, i) => baseNumbers[i % baseNumbers.length],
          );
  // Deal the red numbers first to an independent set. No neighboring 6 or 8.
  const red = nums.filter((n) => n === 6 || n === 8);
  nums = nums.filter((n) => n !== 6 && n !== 8);
  let chosen: number[] = [];
  for (let tries = 0; tries < 500 && chosen.length < red.length; tries++) {
    chosen = [];
    for (const t of shuffle(fertile, rng)) {
      if (
        !chosen.some(
          (id) =>
            b.tiles[id].vertices.filter((v) => t.vertices.includes(v))
              .length === 2,
        )
      )
        chosen.push(t.id);
      if (chosen.length === red.length) break;
    }
  }
  if (chosen.length < red.length)
    throw new Error("No se pudo distribuir el tablero");
  shuffle(red, rng).forEach((n, i) => {
    b.tiles[chosen[i]].number = n;
  });
  const others = shuffle(nums, rng);
  fertile
    .filter((t) => !t.number)
    .forEach((t, i) => {
      t.number = others[i];
    });
  // Walk the perimeter so ports never share a vertex and face the sea.
  const boundary = b.edges.filter((e) => e.tiles.length === 1),
    ordered = [boundary[0]];
  let at = boundary[0].b;
  while (ordered.length < boundary.length) {
    const e = boundary.find(
      (e) => !ordered.includes(e) && (e.a === at || e.b === at),
    );
    if (!e) break;
    ordered.push(e);
    at = e.a === at ? e.b : e.a;
  }
  const portKinds: Board["ports"][number]["resource"][] =
    count <= 4
      ? ["any", "wood", "any", "brick", "wool", "any", "grain", "any", "ore"]
      : count === 6
        ? [
            "any",
            "wood",
            "any",
            "brick",
            "wool",
            "any",
            "grain",
            "any",
            "ore",
            "wool",
            "any",
          ]
        : Array.from(
            { length: count === 8 ? 13 : 16 },
            (_, i) =>
              [
                "any",
                "wood",
                "any",
                "brick",
                "wool",
                "any",
                "grain",
                "any",
                "ore",
              ][i % 9] as Board["ports"][number]["resource"],
          );
  shuffle(portKinds, rng).forEach((resource, i) => {
    b.ports.push({
      edge: ordered[Math.floor((i * ordered.length) / portKinds.length)].id,
      resource,
    });
  });
  return b;
}
