import type { Board, Port } from "./game/types";
import { NAMES } from "./game/types";

export function harborDescription(port: Port) {
  return port.resource === "any"
    ? "Puerto general 3:1 · Entrega 3 cartas del mismo recurso y recibe 1 del recurso que elijas."
    : `Puerto de ${NAMES[port.resource].toLowerCase()} 2:1 · Entrega 2 cartas de ${NAMES[port.resource].toLowerCase()} y recibe 1 del recurso que elijas.`;
}

/** Small painted-style cargo symbols, kept upright with the ship's sail. */
function Cargo({ resource }: { resource: Port["resource"] }) {
  return (
    <svg x="-1" y="-23" width="19" height="19" viewBox="0 0 24 24" aria-hidden="true">
      {resource === "any" && (
        <text x="12" y="20" textAnchor="middle" fontSize="23" fontWeight="800" fill="#315b5c">?</text>
      )}
      {resource === "wood" && (
        <g stroke="#614226" strokeWidth="1.1" strokeLinejoin="round">
          <path d="M3 8 15 3 21 7 8 13Z" fill="#bc8c4e" />
          <path d="M8 13 21 7V13L8 19Z" fill="#795536" />
          <path d="M3 8 8 13V19L3 14Z" fill="#dfb56e" />
          <path d="m10 13 10-4m-9 7 9-4" fill="none" />
          <path d="m4 14 10-4 6 5-11 6Z" fill="#b58347" />
          <ellipse cx="6.5" cy="17.5" rx="3.7" ry="3.3" fill="#e8c586" />
          <ellipse cx="6.5" cy="17.5" rx="1.6" ry="1.4" fill="none" />
        </g>
      )}
      {resource === "brick" && (
        <g stroke="#853e2a" strokeWidth="1" strokeLinejoin="round">
          <path d="m2 12 13-5 7 4-13 6Z" fill="#e59460" />
          <path d="M2 12v6l7 4v-5Z" fill="#c66742" />
          <path d="m9 17 13-6v6L9 22Z" fill="#a85035" />
          <path d="m3 5 12-4 6 4-12 5Z" fill="#eea373" />
          <path d="M3 5v5l6 4v-4Z" fill="#cb6c46" />
          <path d="m9 10 12-5v5L9 14Z" fill="#a85035" />
        </g>
      )}
      {resource === "ore" && (
        <g stroke="#445662" strokeWidth="1" strokeLinejoin="round">
          <path d="m2 16 4-10 8-4 6 8-3 10-10 2Z" fill="#859299" />
          <path d="m6 6 8-4-3 11-9 3Z" fill="#b8c1c2" />
          <path d="m11 13 9-3-3 10-6-1Z" fill="#586c77" />
          <path d="m11 13-5-7m5 7 3-11M7 22l4-9" fill="none" />
        </g>
      )}
      {resource === "grain" && (
        <g stroke="#986821" strokeWidth="1" strokeLinecap="round">
          <path d="m7 22 5-19m0 19 6-16" fill="none" />
          <path d="M11 8Q6 9 7 3q5 0 4 5Zm-1 5Q4 13 5 7q5 1 5 6Zm-1 5Q3 17 4 12q5 1 5 6Zm3-10q-1-5 5-5 0 5-5 5Zm-1 5q0-5 6-5-1 5-6 5Zm-1 5q0-5 6-5-1 5-6 5Zm7-5q-2-4 3-6 2 4-3 6Zm-2 5q-1-4 4-5 1 4-4 5Z" fill="#e8b64d" />
        </g>
      )}
      {resource === "wool" && (
        <g stroke="#59644a" strokeWidth="1" strokeLinejoin="round">
          <path d="M6 16v5m8-5v5" strokeWidth="2" />
          <path d="M5 17Q1 16 3 12 0 8 5 7 5 2 10 4q4-3 6 1 5-1 5 4 3 5-2 7-2 4-6 2-5 3-8-1Z" fill="#fcf4dc" />
          <path d="M16 9q6-3 6 3-1 7-5 4Z" fill="#68705a" />
          <circle cx="20" cy="11" r=".8" fill="#fff9e8" stroke="none" />
          <path d="M7 9q1-2 3 0m-5 4q2-2 4 0" fill="none" stroke="#c7c6a9" />
        </g>
      )}
    </svg>
  );
}

export default function Harbor({ board, port, selected, onSelect }: {
  board: Board;
  port: Port;
  selected: boolean;
  onSelect: () => void;
}) {
  const edge = board.edges[port.edge];
  const a = board.vertices[edge.a], b = board.vertices[edge.b];
  const tile = board.tiles[edge.tiles[0]];
  const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
  const length = Math.hypot(mx - tile.x, my - tile.y);
  const ux = (mx - tile.x) / length, uy = (my - tile.y) / length;
  const x = mx + ux * 44, y = my + uy * 44;
  const angle = Math.atan2(uy, ux) * 180 / Math.PI;
  const label = harborDescription(port);
  return (
    <g className={`harbor${selected ? " selected" : ""}`} role="button" tabIndex={0}
      aria-label={label} aria-expanded={selected} onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}>
      <title>{label} Construye un poblado o una ciudad en uno de los dos extremos del muelle para usarlo.</title>
      <g className="harbor-pier" transform={`translate(${mx} ${my}) rotate(${angle})`} aria-hidden="true">
        <path d="M0-23H6V-5H25V5H6V23H0Z" fill="#a97949" stroke="#634b34" strokeWidth="1.2" />
        <path d="M1-18H5M1-12H5M1-6H5M1 0H5M1 6H5M1 12H5M1 18H5M9-4V4M14-4V4M19-4V4M24-4V4" stroke="#e0ba7b" strokeWidth="1.3" />
        {[-22, 22].map((v) => <circle key={v} cx="3" cy={v} r="2.5" fill="#715039" stroke="#e4c18b" strokeWidth="1" />)}
        <circle cx="24" cy="-5" r="2.3" fill="#715039" stroke="#e4c18b" strokeWidth="1" />
        <circle cx="24" cy="5" r="2.3" fill="#715039" stroke="#e4c18b" strokeWidth="1" />
      </g>
      <path d={`M${mx + ux * 24} ${my + uy * 24}Q${x - 16} ${y + 18} ${x - 20} ${y + 9}`}
        fill="none" stroke="#e9d4a5" strokeWidth="1.2" aria-hidden="true" />
      <g className="harbor-ship" transform={`translate(${x} ${y})`} aria-hidden="true">
        <rect x="-32" y="-29" width="64" height="53" rx="9" fill="transparent" />
        <ellipse cx="0" cy="19" rx="29" ry="5" fill="#245764" opacity=".2" />
        <path d="M-31 21q8 3 15 0m21 1q15 4 26-1" stroke="#d1eddf" strokeWidth="1.3" fill="none" opacity=".7" />
        <path d="M-5-26V11" stroke="#604936" strokeWidth="2" strokeLinecap="round" />
        <path d="M-5-26H7l-5 4h-7Z" fill="#386c65" />
        <path d="M-8-21-26 4l18-2Z" fill="#e6c990" stroke="#8e7952" strokeWidth=".8" strokeLinejoin="round" />
        <path className="harbor-sail" d="M-3-24Q12-25 21-20L23 5Q10 2-3 5Z" fill="#fff3d1" stroke="#a18a5e" strokeWidth="1" />
        <path d="M-1-21V2M20-17l1 19" stroke="#e7d8ad" strokeWidth=".7" />
        <Cargo resource={port.resource} />
        <text x="9" y="4" textAnchor="middle" fontSize="10" fontWeight="800" fill="#3b4137">
          {port.resource === "any" ? "3:1" : "2:1"}
        </text>
        <path className="harbor-hull" d="M-29 7H29L20 17Q0 23-19 17Z" fill="#8b5635" stroke="#543f2b" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M-26 8H26L22 11H-23Z" fill="#d4a467" />
        <path d="M-21 13H21M-15 17H15" stroke="#b7804d" strokeWidth="1" />
        <circle cx="-13" cy="13" r="1.4" fill="#493b2c" />
        <circle cx="13" cy="13" r="1.4" fill="#493b2c" />
      </g>
    </g>
  );
}
