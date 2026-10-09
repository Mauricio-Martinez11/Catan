import { useEffect, useRef, useState, useCallback } from "react";
import type { Action, Count, Game, Player, TurnClock } from "./game/types";
export interface PublicPlayer extends Player {
  resourceCount: number;
  devCount: number;
}
export interface PublicGame extends Game {
  players: PublicPlayer[];
  deckCount: number;
}
export interface RoomView {
  code: string;
  host: number;
  count: Count;
  seed?: number;
  revision: number;
  clock: TurnClock | null;
  seats: { id: number; name: string; color: string; online: boolean }[];
}
export interface Snapshot {
  room: RoomView;
  game: PublicGame | null;
  you: number;
  serverNow: number;
  receivedAt: number;
}
type Session = { code: string; token: string };
const KEY = "catan-seat-v1";
function stored(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}
export function useRoom() {
  const [state, setState] = useState<Snapshot | null>(null),
    [connected, setConnected] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const socket = useRef<WebSocket | null>(null),
    stateRef = useRef(state);
  stateRef.current = state;
  useEffect(() => {
    let stopped = false,
      timer: ReturnType<typeof setTimeout>,
      attempt = 0;
    let resuming = false;
    function connect() {
      if (stopped) return;
      const ws = new WebSocket(
        `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/ws`,
      );
      socket.current = ws;
      ws.onopen = () => {
        if (stopped) {
          ws.close();
          return;
        }
        setConnected(true);
        attempt = 0;
        const s = stored();
        if (s) {
          resuming = true;
          ws.send(JSON.stringify({ type: "resume", ...s }));
        }
      };
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "session") {
          try {
            sessionStorage.setItem(
              KEY,
              JSON.stringify({ code: msg.code, token: msg.token }),
            );
          } catch {
            setError(
              "Este navegador no permite guardar la sesión. No recargues durante la partida.",
            );
          }
        }
        if (msg.type === "state") {
          resuming = false;
          setState({
            room: msg.room,
            game: msg.game,
            you: msg.you,
            serverNow: msg.serverNow,
            receivedAt: Date.now(),
          });
          setBusy(false);
        }
        if (msg.type === "error") {
          setError(msg.message);
          setBusy(false);
          if (resuming) {
            resuming = false;
            sessionStorage.removeItem(KEY);
            setState(null);
          }
        }
        if (msg.type === "left") {
          sessionStorage.removeItem(KEY);
          setState(null);
          setBusy(false);
        }
      };
      ws.onclose = () => {
        if (stopped) return;
        setConnected(false);
        setBusy(false);
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempt++, 5000));
      };
      ws.onerror = () => ws.close();
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.current?.close();
    };
  }, []);
  const send = useCallback((data: object) => {
    if (socket.current?.readyState !== WebSocket.OPEN) {
      setError("Sin conexión. Espera a que la mesa vuelva a conectarse.");
      return false;
    }
    socket.current.send(JSON.stringify(data));
    setBusy(true);
    return true;
  }, []);
  const act = useCallback(
    (action: Action) =>
      send({
        type: "action",
        action,
        revision: stateRef.current?.room.revision,
      }),
    [send],
  );
  return {
    state,
    connected,
    error,
    busy,
    send,
    act,
    clearError: () => setError(""),
  };
}
export type Connection = ReturnType<typeof useRoom>;
