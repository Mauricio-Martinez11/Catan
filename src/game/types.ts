export const RESOURCES = ["wood", "brick", "wool", "grain", "ore"] as const;
export type Resource = (typeof RESOURCES)[number];
export type Hand = Record<Resource, number>;
export type Terrain = Resource | "desert";
export type Count = 2 | 4 | 6 | 8 | 10;
export type DevKind =
  | "knight"
  | "roadBuilding"
  | "plenty"
  | "monopoly"
  | "victory";
export type Phase =
  | "setupSettlement"
  | "setupRoad"
  | "roll"
  | "actions"
  | "discard"
  | "robber"
  | "steal"
  | "freeRoads"
  | "neutralBuild"
  | "forcedTrade"
  | "finished";
export interface Tile {
  id: number;
  x: number;
  y: number;
  resource: Terrain;
  number: number;
  vertices: number[];
}
export interface Vertex {
  id: number;
  x: number;
  y: number;
  tiles: number[];
  edges: number[];
  building?: { owner: number; city: boolean };
}
export interface Edge {
  id: number;
  a: number;
  b: number;
  tiles: number[];
  owner?: number;
}
export interface Port {
  edge: number;
  resource: Resource | "any";
}
export interface Board {
  tiles: Tile[];
  vertices: Vertex[];
  edges: Edge[];
  ports: Port[];
  width: number;
  height: number;
}
export interface DevCard {
  kind: DevKind;
  bought: number;
}
export interface Player {
  id: number;
  name: string;
  color: string;
  resources: Hand;
  dev: DevCard[];
  knights: number;
  neutral?: boolean;
}
export interface Duel {
  tokens: [number, number];
  supply: number;
  rolls: number[];
  spent: boolean;
  retiredKnight: boolean;
  neutralBuild: {
    kind: "road" | "settlement";
    resume: "roll" | "actions" | "freeRoads";
  } | null;
  forcedTradeReturn: "roll" | "actions" | null;
}
export interface Trade {
  with: number;
  proposer: number;
  give: Hand;
  receive: Hand;
}
export interface Game {
  version: 1;
  id: string;
  board: Board;
  players: Player[];
  duel: Duel | null;
  bank: Hand;
  deck: DevKind[];
  phase: Phase;
  current: number;
  primary: number;
  paired: boolean;
  turn: number;
  round: number;
  setupStep: number;
  setupVertex: number | null;
  robber: number;
  dice: [number, number] | null;
  production: {
    id: number;
    total: number;
    tiles: number[];
    gains: Hand[];
    shortages: Resource[];
  } | null;
  playedDev: boolean;
  returnPhase: "roll" | "actions";
  freeRoads: number;
  discardQueue: number[];
  longest: number | null;
  army: number | null;
  roadLengths: number[];
  winner: number | null;
  log: string[];
  trade: Trade | null;
  rng: number;
  distribution: number[];
}
export interface TurnClock {
  kind: "turn" | "setup" | "robber" | "discard";
  player: number;
  deadline: number;
  duration: number;
  remainingTurnMs: number;
}
export type Action =
  | { type: "settlement" | "city" | "road"; id: number }
  | { type: "roll" | "end" | "buyDev" | "declineTrade" }
  | { type: "discard"; resources: Hand }
  | { type: "robber"; tile: number }
  | { type: "steal"; player: number }
  | { type: "bank"; give: Resource; receive: Resource; quantity: number }
  | { type: "offer"; with: number; give: Hand; receive: Hand }
  | { type: "acceptTrade"; player: number }
  | { type: "playDev"; index: number; resources?: Resource[] }
  | { type: "neutralBuild"; player: number; id: number }
  | { type: "forceTrade" | "chaseRobber" | "retireKnight" }
  | { type: "returnTrade"; resources: Hand };
export const NAMES: Record<Terrain, string> = {
  wood: "Madera",
  brick: "Arcilla",
  wool: "Lana",
  grain: "Cereal",
  ore: "Mineral",
  desert: "Desierto",
};
export const COLORS: Record<Terrain, string> = {
  wood: "#548b67",
  brick: "#ca8066",
  wool: "#a4bc76",
  grain: "#dfbb62",
  ore: "#87979d",
  desert: "#d7c69a",
};
export const PLAYER_COLORS = [
  "#df7857",
  "#418dab",
  "#caa141",
  "#936fab",
  "#4f9876",
  "#d178a2",
  "#697bd1",
  "#9b7963",
  "#76a5a0",
  "#a39645",
];
export const DEV_NAMES: Record<DevKind, string> = {
  knight: "Caballero",
  roadBuilding: "Construcción de carreteras",
  plenty: "Año de abundancia",
  monopoly: "Monopolio",
  victory: "Punto de victoria",
};
export const emptyHand = (n = 0): Hand => ({
  wood: n,
  brick: n,
  wool: n,
  grain: n,
  ore: n,
});
