import { useId, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Maximize2, UserRound, X } from "lucide-react";
import type { Board as BoardType, Game } from "./game/types";
import { COLORS, NAMES } from "./game/types";
import Harbor, { harborDescription } from "./Harbor";
import { BuildingModel, RoadModel } from "./GameArt";
export default function Board({
  board,
  game,
  legalVertices = [],
  legalEdges = [],
  onVertex,
  onEdge,
  onTile,
}: {
  board: BoardType;
  game?: Game;
  legalVertices?: number[];
  legalEdges?: number[];
  onVertex?: (id: number) => void;
  onEdge?: (id: number) => void;
  onTile?: (id: number) => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const dragged = useRef(false);
  const [selectedPort, setSelectedPort] = useState<number | null>(null);
  const port = board.ports.find((p) => p.edge === selectedPort);
  const uid = useId().replace(/:/g, "");
  const beginPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "touch" && e.button !== 0) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    dragged.current = false;
    setDragging(true);
  };
  const movePan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) dragged.current = true;
    setPan({ x: dragStart.current.panX + dx, y: dragStart.current.panY + dy });
  };
  const endPan = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStart.current && e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragStart.current = null;
    setDragging(false);
  };
  return (
    <div className="map-shell">
      <div className="map-ocean">
        <div
          className={`map-scroll${dragging ? " is-panning" : ""}`}
          onPointerDown={beginPan}
          onPointerMove={movePan}
          onPointerUp={endPan}
          onPointerCancel={endPan}
          onClickCapture={(e) => {
            if (dragged.current) {
              e.stopPropagation();
              dragged.current = false;
            }
          }}
          aria-label="Tablero desplazable"
        >
          <svg
            className="island"
            viewBox={`0 0 ${board.width} ${board.height}`}
            style={{
              width: `${zoom * 100}%`,
              minWidth: zoom > 1 ? "650px" : undefined,
              maxHeight: zoom > 1 ? "none" : undefined,
              transform: `translate(${pan.x}px, ${pan.y}px)`,
            }}
            aria-label="Tablero de CATAN"
            role="group"
          >
            <defs>
              {board.tiles.map((t) => (
                <clipPath key={t.id} id={`${uid}-terrain-${t.id}`}>
                  <polygon
                    points={t.vertices
                      .map(
                        (id) =>
                          `${board.vertices[id].x},${board.vertices[id].y}`,
                      )
                      .join(" ")}
                  />
                </clipPath>
              ))}
              <filter
                id="landShadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="150%"
              >
                <feDropShadow
                  dx="0"
                  dy="7"
                  stdDeviation="3"
                  floodColor="#144947"
                  floodOpacity=".17"
                />
              </filter>
              <pattern
                id="sea"
                width="36"
                height="36"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M4 18q5 4 10 0t10 0"
                  fill="none"
                  stroke="#fff"
                  strokeOpacity=".13"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect width={board.width} height={board.height} fill="url(#sea)" />
            <g filter="url(#landShadow)">
              {board.tiles.map((t) => {
                const producing =
                  !!game?.dice && !!game.production?.tiles.includes(t.id);
                const outline = t.vertices
                  .map(
                    (id) => `${board.vertices[id].x},${board.vertices[id].y}`,
                  )
                  .join(" ");
                return (
                  <g
                    key={t.id}
                    className={`tile ${producing ? "producing" : ""} ${game?.phase === "robber" && t.id !== game.robber ? "target" : ""}`}
                    role={game?.phase === "robber" ? "button" : undefined}
                    tabIndex={game?.phase === "robber" ? 0 : undefined}
                    aria-label={`${NAMES[t.resource]} ${t.number || ""}, casilla ${t.id + 1}`}
                    onClick={() => onTile?.(t.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") onTile?.(t.id);
                    }}
                  >
                    <polygon
                      points={t.vertices
                        .map(
                          (v) =>
                            `${board.vertices[v].x},${board.vertices[v].y}`,
                        )
                        .join(" ")}
                      fill={COLORS[t.resource]}
                      stroke="#f0dfb5"
                      strokeWidth="4"
                      strokeLinejoin="round"
                    />
                    <image
                      href={`/art/${t.resource}.webp`}
                      x={t.x - 48}
                      y={t.y - 48}
                      width="96"
                      height="96"
                      clipPath={`url(#${uid}-terrain-${t.id})`}
                      preserveAspectRatio="xMidYMid slice"
                      pointerEvents="none"
                    />
                    <polygon
                      className="terrain-rim"
                      points={outline}
                      fill="none"
                      stroke={producing ? "#fff1a9" : "#efd9a5"}
                      strokeWidth={producing ? 4 : 2.2}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                    {t.number > 0 && (
                      <g
                        className={
                          game?.dice && game.dice[0] + game.dice[1] === t.number
                            ? "token rolled"
                            : "token"
                        }
                      >
                        <circle
                          cx={t.x}
                          cy={t.y - 2}
                          r="16"
                          fill="#fff7e6"
                          stroke="#e4d5b3"
                          strokeWidth="1.5"
                        />
                        <text
                          x={t.x}
                          y={t.y + 1}
                          textAnchor="middle"
                          fill={
                            t.number === 6 || t.number === 8
                              ? "#b95842"
                              : "#354b42"
                          }
                          fontWeight="750"
                          fontSize="20"
                        >
                          {t.number}
                        </text>
                        <text
                          x={t.x}
                          y={t.y + 10}
                          textAnchor="middle"
                          fontSize="6"
                          letterSpacing="1"
                          fill={
                            t.number === 6 || t.number === 8
                              ? "#b95842"
                              : "#647265"
                          }
                        >
                          {"•".repeat(6 - Math.abs(7 - t.number))}
                        </text>
                      </g>
                    )}
                    {(game?.robber === t.id ||
                      (!game &&
                        t.id ===
                          board.tiles.find((x) => x.resource === "desert")
                            ?.id)) && (
                      <g>
                        <circle
                          cx={t.x}
                          cy={t.y - 2}
                          r="17"
                          fill="#253230"
                          stroke="#ead7ae"
                          strokeWidth="1.5"
                        />
                        <UserRound
                          x={t.x - 12}
                          y={t.y - 14}
                          width="24"
                          height="24"
                          stroke="#f8eed8"
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
            {board.ports.map((p) => (
              <Harbor key={p.edge} board={board} port={p}
                selected={p.edge === selectedPort}
                onSelect={() => setSelectedPort(p.edge === selectedPort ? null : p.edge)} />
            ))}
            {board.edges
              .filter((e) => e.owner !== undefined)
              .map((e) => {
                const a = board.vertices[e.a],
                  b = board.vertices[e.b];
                return (
                  <g key={e.id} transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2}) rotate(${Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI})`}>
                    <RoadModel length={44} color={game?.players[e.owner!].color ?? "#c99965"} />
                    <title>{game?.players[e.owner!].name}: carretera</title>
                  </g>
                );
              })}
            {legalEdges.map((id) => {
              const e = board.edges[id],
                a = board.vertices[e.a],
                b = board.vertices[e.b];
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Construir carretera ${id + 1}`}
                  className="edge-target"
                  onClick={() => onEdge?.(id)}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") onEdge?.(id);
                  }}
                >
                  <rect
                    x={Math.min(a.x, b.x) - 10}
                    y={Math.min(a.y, b.y) - 10}
                    width={Math.abs(a.x - b.x) + 20}
                    height={Math.abs(a.y - b.y) + 20}
                    fill="transparent"
                    pointerEvents="none"
                  />
                  <line
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="transparent"
                    strokeWidth="24"
                  />
                  <line
                    x1={a.x + (b.x - a.x) * 0.2}
                    y1={a.y + (b.y - a.y) * 0.2}
                    x2={b.x + (a.x - b.x) * 0.2}
                    y2={b.y + (a.y - b.y) * 0.2}
                    stroke="#ffffff"
                    strokeOpacity=".85"
                    strokeWidth="7"
                    strokeDasharray="3 5"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
            {board.vertices
              .filter((v) => v.building)
              .map((v) => (
                  <g
                  key={v.id}
                  className="building"
                  transform={`translate(${v.x},${v.y}) scale(1.22)`}
                >
                  <BuildingModel city={v.building!.city} color={game?.players[v.building!.owner].color ?? "#c99965"} />
                  <title>
                    {game?.players[v.building!.owner].name}:{" "}
                    {v.building!.city ? "ciudad" : "poblado"}
                  </title>
                </g>
              ))}
            {legalVertices.map((id) => {
              const v = board.vertices[id];
              return (
                <g
                  key={id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Construir en intersección ${id + 1}`}
                  className="vertex-target"
                  onClick={() => onVertex?.(id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onVertex?.(id);
                  }}
                >
                  <circle cx={v.x} cy={v.y} r="15" fill="transparent" />
                  <circle
                    cx={v.x}
                    cy={v.y}
                    r="7"
                    fill="#fff8e9"
                    stroke="#28695b"
                    strokeWidth="2"
                  />
                  <path
                    d={`M${v.x - 3} ${v.y}h6m-3-3v6`}
                    stroke="#28695b"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="ocean-label">EL MAR DE CATAN</div>
        <div className="map-controls">
          <button
            aria-label="Alejar tablero"
            onClick={() => setZoom((value) => Math.max(1, value - 0.25))}
          >
            <ZoomOut size={17} />
          </button>
          <button aria-label="Restablecer tablero" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <Maximize2 size={16} />
          </button>
          <button
            aria-label="Acercar tablero"
            onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
          >
            <ZoomIn size={17} />
          </button>
        </div>
      </div>
      {port && (
        <div className="harbor-info" role="status">
          <div>
            <strong>{harborDescription(port)}</strong>
            <span>Necesitas un poblado o una ciudad en uno de los dos extremos del muelle.</span>
          </div>
          <button onClick={() => setSelectedPort(null)} aria-label="Cerrar información del puerto"><X size={17} /></button>
        </div>
      )}
    </div>
  );
}
