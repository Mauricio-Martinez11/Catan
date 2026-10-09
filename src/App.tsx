import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable } from "react-native-web";
import {
  Hexagon,
  ArrowUpRight,
  Users,
  BookOpen,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Sprout,
  Flag,
  Anchor,
  Copy,
  Check,
  Wifi,
  WifiOff,
  LogOut,
  Crown,
  X,
} from "lucide-react";
import Board from "./Board";
import Rules from "./Rules";
import GameScreen from "./GameScreen";
import { makeBoard } from "./game/board";
import { PLAYER_COLORS } from "./game/types";
import type { Count } from "./game/types";
import { useRoom } from "./network";
import type { Connection, Snapshot } from "./network";

export default function App() {
  const conn = useRoom(),
    [rules, setRules] = useState(false);
  const stateRef = useRef(conn.state);
  stateRef.current = conn.state;
  useEffect(() => {
    if (conn.state) document.title = `CATAN · Sala ${conn.state.room.code}`;
    else document.title = "CATAN · La mesa está lista";
  }, [conn.state?.room.code]);
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => unknown;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      Promise.resolve(
        context.registerTool(
          {
            name: "read_catan_table",
            title: "Consultar la mesa de CATAN",
            description:
              "Consulta la sala, los jugadores conectados y la fase pública. No devuelve manos privadas ni cambia la partida.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: true },
            execute: (input: unknown) => {
              if (
                !input ||
                typeof input !== "object" ||
                Object.keys(input).length
              )
                throw new Error("No se aceptan parámetros.");
              const state = stateRef.current;
              return state
                ? {
                    code: state.room.code,
                    players: state.room.seats.map((s) => ({
                      name: s.name,
                      online: s.online,
                    })),
                    phase: state.game?.phase ?? "waiting",
                    current: state.game
                      ? state.game.players[state.game.current].name
                      : null,
                  }
                : { phase: "lobby" };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);
  return (
    <div className={`app${conn.state?.game ? " in-game" : ""}`}>
      <header className="topbar">
        <a href="/" className="brand" aria-label="CATAN, inicio">
          <Hexagon size={32} />
          <span>
            CATAN<span className="brand-dot">.</span>
          </span>
        </a>
        <div className="header-center">
          {conn.state ? (
            <>
              SALA <b>{conn.state.room.code}</b>{" "}
              <span className="dot-sep">·</span> {conn.state.room.count}{" "}
              JUGADORES
            </>
          ) : (
            "UN TABLERO. MIL POSIBILIDADES."
          )}
        </div>
        <div className="header-actions">
          <span
            className={`connection ${conn.connected ? "" : "offline"}`}
            title={
              conn.connected
                ? "Conectado al servidor local"
                : "Reconectando al servidor"
            }
          >
            {conn.connected ? <Wifi size={15} /> : <WifiOff size={15} />}
            <span>{conn.connected ? "En línea" : "Reconectando"}</span>
          </span>
          <button className="quiet" onClick={() => setRules(true)}>
            <BookOpen size={17} /> Cómo jugar <ArrowUpRight size={15} />
          </button>
        </div>
      </header>
      {conn.state?.game ? (
        <GameScreen conn={conn} snapshot={conn.state} />
      ) : conn.state ? (
        <Waiting conn={conn} snapshot={conn.state} />
      ) : (
        <Lobby conn={conn} />
      )}
      <footer className="site-footer">
        <span>Hecho para compartir mesa.</span>
        <span>Proyecto de aficionados · Sin afiliación oficial</span>
        <span>
          ES <span className="live-dot" /> Español
        </span>
      </footer>
      {rules && <Rules onClose={() => setRules(false)} />}{" "}
      {conn.error && (
        <div className="toast error" role="alert">
          <span>{conn.error}</span>
          <button onClick={conn.clearError} aria-label="Cerrar mensaje">
            <X size={17} />
          </button>
        </div>
      )}
      {!conn.connected && conn.state && (
        <div className="connection-banner" role="status">
          <WifiOff size={17} /> Conexión interrumpida. Recuperaremos tu asiento
          automáticamente.
        </div>
      )}
    </div>
  );
}
function Lobby({ conn }: { conn: Connection }) {
  const initialCode = new URLSearchParams(location.search).get("sala") || "";
  const [count, setCount] = useState<Count>(4),
    [seed, setSeed] = useState(4824),
    [name, setName] = useState(""),
    [code, setCode] = useState(initialCode),
    [mode, setMode] = useState<"create" | "join">(
      initialCode ? "join" : "create",
    );
  const board = useMemo(() => makeBoard(count, seed), [count, seed]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "create") conn.send({ type: "create", name, count });
    else conn.send({ type: "join", name, code: code.trim().toUpperCase() });
  }
  return (
    <main className="lobby">
      <section className="lobby-config">
        <div className="eyebrow">
          <span className="live-dot" /> REÚNE A TU GENTE
        </div>
        <h1>
          La isla espera.
          <br />
          <span>La historia es tuya.</span>
        </h1>
        <p className="intro">
          Un poco de estrategia, buenos intercambios
          <br className="desktop" /> y una mesa llena de amigos.
        </p>
        <form className="setup-panel" onSubmit={submit}>
          <div className="lobby-tabs">
            <button
              type="button"
              className={mode === "create" ? "active" : ""}
              onClick={() => setMode("create")}
            >
              Crear una mesa
            </button>
            <button
              type="button"
              className={mode === "join" ? "active" : ""}
              onClick={() => setMode("join")}
            >
              Tengo un código
            </button>
          </div>
          {mode === "create" ? (
            <>
              <div className="section-label">
                <Users size={17} /> ¿Cuántos vamos a jugar?
              </div>
              <View style={{ flexDirection: "row", gap: 6, marginTop: 16 }}>
                {([2, 4, 6, 8, 10] as Count[]).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setCount(n)}
                    role="button"
                    aria-label={`${n} jugadores`}
                    aria-pressed={count === n}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      backgroundColor: count === n ? "#164f4e" : "#f9f8f3",
                      padding: "14px 4px",
                      borderRadius: 12,
                      borderWidth: 1,
                      borderStyle: "solid",
                      borderColor: count === n ? "#164f4e" : "#e3e4da",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 24,
                        fontWeight: "700",
                        color: count === n ? "#fff" : "#40594e",
                        textAlign: "center",
                      }}
                    >
                      {n}
                    </Text>
                    <Text
                      style={{
                        fontSize: 8,
                        color: count === n ? "#cae0d3" : "#6b7d72",
                        textAlign: "center",
                        marginTop: 3,
                      }}
                    >
                      JUGADORES
                    </Text>
                  </Pressable>
                ))}
              </View>
              <div className="mode-note">
                <ShieldCheck size={15} />
                {count === 2
                  ? "CATAN para dos · neutrales y fichas de comercio"
                  : count === 4
                    ? "Juego base · 19 hexágonos"
                    : count === 6
                      ? "Extensión de 6 · turnos por parejas"
                      : "Variante casera · reglas adaptadas, no oficiales"}
              </div>
            </>
          ) : (
            <label className="field-label">
              Código de la mesa
              <input
                className="code-input"
                value={code}
                maxLength={6}
                minLength={6}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                required
                autoComplete="off"
              />
            </label>
          )}
          <label className="field-label your-name">
            Tu nombre
            <div className="name-field">
              <span style={{ background: PLAYER_COLORS[0] }}>
                <Users size={13} />
              </span>
              <input
                aria-label="Tu nombre"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="¿Cómo te llamas?"
                maxLength={24}
                required
                autoComplete="nickname"
              />
            </div>
          </label>
          <button
            className="primary large"
            disabled={!conn.connected || conn.busy}
          >
            {conn.busy
              ? "Conectando…"
              : mode === "create"
                ? "Crear la partida"
                : "Unirme a la mesa"}{" "}
            <ChevronRight size={19} />
          </button>
          <p className="local-note">
            Cada quien en su dispositivo · En la misma red Wi-Fi
          </p>
        </form>
        <div className="lobby-footer">
          <span>
            <Flag size={15} /> 10 puntos para ganar
          </span>
          <span>
            <Anchor size={15} /> Comercio y estrategia
          </span>
        </div>
      </section>
      <section className="lobby-board">
        <div className="board-heading">
          <div>
            <div className="eyebrow">VUESTRA PRÓXIMA AVENTURA</div>
            <h2>Una isla por descubrir</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Generar otra isla"
            onClick={() => setSeed(Math.floor(Math.random() * 1e8))}
          >
            <RotateCcw size={19} />
          </button>
        </div>
        <Board board={board} />
        <div className="board-caption">
          <span>
            <Sprout size={17} /> Cada isla es un nuevo comienzo.
          </span>
          <span>
            {board.tiles.length} territorios <span className="dot-sep">·</span>{" "}
            {count} jugadores
          </span>
        </div>
        <div className="how-strip">
          <div>
            <span>01</span>
            <p>
              <b>Construye</b>
              <small>Haz crecer tus poblados.</small>
            </p>
          </div>
          <div>
            <span>02</span>
            <p>
              <b>Intercambia</b>
              <small>Encuentra el mejor trato.</small>
            </p>
          </div>
          <div>
            <span>03</span>
            <p>
              <b>Conquista</b>
              <small>Llega a los 10 puntos.</small>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
function Waiting({ conn, snapshot }: { conn: Connection; snapshot: Snapshot }) {
  const { room, you } = snapshot;
  const board = useMemo(
    () => makeBoard(room.count, room.seed || 1),
    [room.count, room.seed],
  );
  const [addresses, setAddresses] = useState<string[]>([]),
    [host, setHost] = useState(location.hostname),
    [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch("/api/network")
      .then((r) => r.json())
      .then((data) => {
        setAddresses(data.addresses);
        if (
          ["localhost", "127.0.0.1"].includes(location.hostname) &&
          data.addresses.length
        )
          setHost(
            data.addresses.find(
              (a: string) =>
                a.startsWith("192.168.0.") || a.startsWith("192.168.1."),
            ) || data.addresses[0],
          );
      })
      .catch(() => {});
  }, []);
  const link = `${location.protocol}//${host}${location.port ? ":" + location.port : ""}/?sala=${room.code}`,
    ready =
      room.seats.length === room.count && room.seats.every((s) => s.online);
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const field = document.getElementById("invite-link") as HTMLInputElement;
      field?.select();
    }
  }
  return (
    <main className="lobby waiting">
      <section className="lobby-config">
        <div className="eyebrow">
          <span className="live-dot" /> LA MESA ESTÁ ABIERTA
        </div>
        <h1>
          Falta tu gente.
          <br />
          <span>Comparte la isla.</span>
        </h1>
        <p className="intro">
          Cada jugador entra con este enlace o código.
          <br />
          Todos debéis estar en la misma red local.
        </p>
        <div className="room-code">
          <small>CÓDIGO DE LA MESA</small>
          <strong>{room.code}</strong>
          <span>
            {room.seats.length} de {room.count} en la mesa
          </span>
        </div>
        <div className="invite-link">
          <input
            id="invite-link"
            aria-label="Enlace de invitación"
            value={link}
            readOnly
            onClick={(e) => e.currentTarget.select()}
          />
          <button aria-label="Copiar invitación" onClick={copy}>
            {copied ? <Check size={18} /> : <Copy size={18} />}
          </button>
        </div>
        {addresses.length > 1 && (
          <label className="network-choice">
            Dirección de red
            <select
              aria-label="Dirección de red"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            >
              {[...new Set([location.hostname, ...addresses])].map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </label>
        )}
        <div className="waiting-seats">
          {Array.from({ length: room.count }, (_, i) => {
            const seat = room.seats[i];
            return (
              <div key={i} className={`waiting-seat ${seat ? "" : "empty"}`}>
                <span
                  className="avatar"
                  style={{ background: PLAYER_COLORS[i] }}
                >
                  {seat ? seat.name[0].toUpperCase() : "+"}
                </span>
                <div>
                  <b>
                    {seat?.name || "Asiento libre"}
                    {seat?.id === you ? " (tú)" : ""}
                  </b>
                  <small>
                    {seat
                      ? seat.online
                        ? "En la mesa"
                        : "Desconectado"
                      : "Esperando a un amigo"}
                  </small>
                </div>
                {seat?.id === room.host && <Crown size={16} />}
              </div>
            );
          })}
        </div>
        {you === room.host ? (
          <button
            className="primary large"
            disabled={!ready || conn.busy || !conn.connected}
            onClick={() => conn.send({ type: "start" })}
          >
            {ready
              ? "Comenzar la partida"
              : `Esperando ${room.count - room.seats.filter((s) => s.online).length} jugadores`}
            <ChevronRight size={19} />
          </button>
        ) : (
          <div className="waiting-host">
            El anfitrión comenzará cuando estéis todos.
          </div>
        )}
        <p className="local-note">
          Turnos de 1:30 · ladrón y descartes de 0:30 · avance automático al
          agotarse el tiempo.
        </p>
        <p className="local-note">
          Las partidas viven mientras este servidor siga encendido.
        </p>
        {room.count === 2 && (
          <p className="local-note">
            CATAN para dos incluye casas neutrales amarillas y moradas. No son
            jugadores adicionales ni reciben recursos; ambos construís para ellas.
          </p>
        )}
        <button
          className="quiet leave"
          disabled={conn.busy || !conn.connected}
          onClick={() => conn.send({ type: "leave" })}
        >
          <LogOut size={15} /> Salir de esta mesa
        </button>
      </section>
      <section className="lobby-board">
        <div className="board-heading">
          <div>
            <div className="eyebrow">ESTA ES VUESTRA ISLA</div>
            <h2>
              {room.count === 2
                ? "Una isla. Dos estrategas."
                : room.count === 4
                  ? "La aventura clásica"
                  : room.count === 6
                    ? "Una mesa más grande"
                    : "Un mundo por compartir"}
            </h2>
          </div>
          <span className="tag">
            {room.count === 2
              ? "2 jugadores · CATAN para dos"
              : room.count > 6
                ? "Variante casera"
                : `${room.count} jugadores`}
          </span>
        </div>
        <Board board={board} />
        <div className="board-caption">
          <span>
            <ShieldCheck size={16} /> Manos privadas. Turnos compartidos.
          </span>
          <span>{board.tiles.length} territorios</span>
        </div>
      </section>
    </main>
  );
}
