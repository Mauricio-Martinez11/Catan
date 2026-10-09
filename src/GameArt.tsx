export type PieceKind = "road" | "settlement" | "city" | "development";

export function BuildingModel({ city = false, color }: { city?: boolean; color: string }) {
  return (
    <g stroke="#423b32" strokeWidth="1.1" strokeLinejoin="round">
      <ellipse cx="1" cy="11" rx={city ? 17 : 12} ry="4" fill="#173c44" opacity=".24" stroke="none" />
      {city ? <>
        <path d="M-15 0-5-8 6-3V10L-5 14-15 9Z" fill={color} />
        <path d="M-5-8 6-3V10L-5 14Z" fill="#000" opacity=".18" stroke="none" />
        <path d="m-17 0 11-12 14 7-11 7Z" fill={color} />
        <path d="m-17 0 11-12 14 7-11 7Z" fill="#fff" opacity=".22" stroke="none" />
        <path d="M2-5 9-11 17-7V8L9 12 2 8Z" fill={color} />
        <path d="M9-11 17-7V8L9 12Z" fill="#000" opacity=".2" stroke="none" />
        <path d="M0-5 8-18 19-8 10-4Z" fill={color} />
        <path d="M0-5 8-18 10-4Z" fill="#fff" opacity=".28" stroke="none" />
        <path d="M5 3V-1l3-1v5Zm7-3 3-1v4l-3 1Z" fill="#fff2ba" strokeWidth=".7" />
        <path d="M-11 9V4l4 1v6" fill="#654c3c" strokeWidth=".8" />
      </> : <>
        <path d="M-11-2 0-7 11-2V10L0 14-11 9Z" fill={color} />
        <path d="M0-7 11-2V10L0 14Z" fill="#000" opacity=".2" stroke="none" />
        <path d="M-14-2-3-14 13-5 1 0Z" fill={color} />
        <path d="M-14-2-3-14 13-5 1 0Z" fill="#fff" opacity=".28" stroke="none" />
        <path d="M-3-14 1 0 13-5" fill="#000" opacity=".1" stroke="none" />
        <path d="M-8 9V3l4 1v7" fill="#634c3c" strokeWidth=".8" />
        <path d="M4 3 8 2v4L4 7Z" fill="#ffedb5" strokeWidth=".7" />
      </>}
    </g>
  );
}

export function RoadModel({ length = 44, color }: { length?: number; color: string }) {
  const h = length / 2;
  return <g stroke="#473d31" strokeWidth=".8" strokeLinejoin="round">
    <path d={`M${-h} 0  ${h - 3} 0 ${h} 4 ${-h + 3} 4Z`} fill="#143b42" opacity=".25" stroke="none" />
    <path d={`M${-h}-4H${h - 3}L${h}-1V3H${-h + 3}L${-h} 0Z`} fill={color} />
    <path d={`M${-h}-4H${h - 3}L${h}-1H${-h + 3}Z`} fill="#fff" opacity=".35" stroke="none" />
    <path d={`M${-h + 3}-1H${h}V3H${-h + 3}Z`} fill="#000" opacity=".12" stroke="none" />
    <path d={`M${-h + 3}-1V3`} fill="none" />
  </g>;
}

export function PieceIcon({ kind, color = "#cd9860", size = 36 }: { kind: PieceKind; color?: string; size?: number }) {
  return <svg width={size} height={size} viewBox="-23 -24 46 46" aria-hidden="true" className="piece-icon">
    {kind === "road" ? <g transform="rotate(-35)"><RoadModel color={color} /></g>
      : kind === "development" ? <g stroke="#61503c" strokeWidth="1.3" strokeLinejoin="round">
        <rect x="-13" y="-18" width="26" height="35" rx="3" fill="#597887" transform="rotate(-8)" />
        <rect x="-9" y="-16" width="26" height="35" rx="3" fill="#f0d7a5" />
        <path d="m4-9 8 4v8q0 6-8 10-8-4-8-10v-8Z" fill="#557a69" />
        <path d="M4-5v12m-4-8h8" stroke="#f8e8bd" strokeWidth="2" />
      </g> : <BuildingModel city={kind === "city"} color={color} />}
  </svg>;
}
