import { Modal, ResourceList } from "./components";
import { COSTS } from "./game/engine";
export default function Rules({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="La guía de la mesa" onClose={onClose} wide>
      <p className="modal-intro">
        Reglas explicadas en español para esta implementación. El juego base se
        gana con 10 puntos durante tu propio turno.
      </p>
      <div className="rules-grid">
        <article>
          <h3>Reloj de la mesa · regla personalizada</h3>
          <p>
            Cada turno dispone de 1 minuto y 30 segundos para lanzar, construir
            y comerciar. La preparación concede ese tiempo para cada pareja de
            poblado y carretera. El reloj es compartido y no se reinicia al
            recargar.
          </p>
          <p>
            El ladrón tiene 30 segundos para moverlo y elegir a quién robar.
            Cada descarte tiene también 30 segundos. Mientras tanto se pausa el
            tiempo restante del turno.
          </p>
          <p>
            Al agotarse el tiempo, las ofertas se cierran sin aceptarse. El
            servidor completa al azar las decisiones obligatorias pendientes
            —dados, colocaciones gratuitas, descartes o robo— y pasa el turno.
            No compra ni construye gastando recursos por ti.
          </p>
          <p>
            La producción se reparte automáticamente: un recurso por poblado y
            dos por ciudad, excepto el terreno bloqueado. Bajo el tablero
            aparece el resumen de lo recibido.
          </p>
        </article>
        <article>
          <h3>2 jugadores · CATAN para dos</h3>
          <p>
            Dos personas compiten a 10 puntos en la isla de 19 terrenos. Los dos
            colores neutrales empiezan con un poblado cada uno, sin carretera;
            no reciben recursos, cartas ni turnos, pero pueden obtener la mayor
            ruta.
          </p>
          <p>
            Resuelve dos tiradas por turno. La segunda debe tener un total
            distinto; los repetidos se vuelven a lanzar automáticamente.
            Resuelve cada producción o siete antes de continuar. Puedes jugar
            desarrollo entre tiradas.
          </p>
          <p>
            Después de construir una carretera o poblado, coloca gratis la misma
            pieza para un neutral. Si ninguno puede fundar un poblado, coloca
            una carretera. También ocurre con las carreteras de desarrollo; no
            durante la preparación ni al mejorar a ciudad.
          </p>
          <p>
            Empiezas con 5 fichas de comercio; hay 20 en total. Una vez por
            turno puedes pagar 1 ficha, o 2 si tienes más puntos visibles que tu
            rival, para tomarle hasta dos recursos al azar y devolverle dos de
            tu elección, o enviar el ladrón al desierto sin robar.
          </p>
          <p>
            Ganas 2 fichas por poblado junto al desierto y 1 junto a la costa;
            son acumulables, también en la preparación. Una vez por turno puedes
            retirar un caballero jugado por hasta 2 fichas disponibles. Tu
            ejército disminuye y puedes perder el premio.
          </p>
        </article>
        <article>
          <h3>01 · Prepara tu isla</h3>
          <p>
            Se sortea el primer jugador lanzando dos dados para cada persona y
            repitiendo los empates. Cada uno coloca un poblado y una carretera,
            en orden, y después otros dos en orden inverso. Recibes un recurso
            por cada terreno productivo junto a tu segundo poblado.
          </p>
          <p>
            Los poblados deben estar separados por al menos dos aristas. Durante
            la preparación no necesitan conectar con tu primera carretera.
          </p>
        </article>
        <article>
          <h3>02 · Un turno, muchas posibilidades</h3>
          <p>
            Lanza los dos dados. Los terrenos con ese número producen un recurso
            por poblado y dos por ciudad. El terreno del ladrón no produce.
            Después puedes comerciar, construir y jugar desarrollo en el orden
            que prefieras.
          </p>
          <p>
            Si un recurso escasea y lo necesitan varias personas, nadie lo
            recibe. Si lo recibe una sola persona, toma las cartas disponibles.
          </p>
        </article>
        <article>
          <h3>03 · Dale forma a tu isla</h3>
          <p>
            Una carretera se conecta a tu red o a tus edificios y no atraviesa
            un edificio rival. Un poblado nuevo se conecta a tu carretera y
            respeta la distancia. Una ciudad sustituye a un poblado propio, que
            regresa a tu reserva.
          </p>
          <div className="rules-costs">
            {(["road", "settlement", "city", "development"] as const).map(
              (key, i) => (
                <div key={key}>
                  <span>
                    {
                      [
                        "Carretera",
                        "Poblado · 1 punto",
                        "Ciudad · 2 puntos",
                        "Desarrollo",
                      ][i]
                    }
                  </span>
                  <ResourceList hand={COSTS[key]} />
                </div>
              ),
            )}
          </div>
          <p>
            Cada persona dispone de 15 carreteras, 5 poblados y 4 ciudades. No
            se pueden recolocar ni vender.
          </p>
        </article>
        <article>
          <h3>04 · El ladrón y el siete</h3>
          <p>
            Al salir 7 no hay producción. Quien tenga más de 7 recursos descarta
            la mitad, redondeando hacia abajo. No se cuentan cartas de
            desarrollo. Cada jugador elige sus descartes.
          </p>
          <p>
            Quien lanzó mueve el ladrón a otro territorio, incluso al desierto,
            y roba un recurso al azar a un rival con un edificio adyacente. Si
            hay varios, elige a quién robar.
          </p>
        </article>
        <article>
          <h3>05 · Hagamos un trato</h3>
          <p>
            Puedes proponer intercambios con quien tiene el turno. Durante tu
            turno puedes negociar con cualquier rival. Debe aceptar desde su
            dispositivo. No se permiten regalos, préstamos ni ofrecer y pedir el
            mismo recurso en un trato. Los demás jugadores no comercian entre sí
            fuera de su turno.
          </p>
          <p>
            Con el banco cambias 4 recursos iguales por 1. Un edificio en un
            puerto general permite 3:1; un puerto especializado permite 2:1 para
            el recurso indicado. El color del ancla identifica el recurso del
            puerto.
          </p>
        </article>
        <article>
          <h3>06 · Cartas de desarrollo</h3>
          <p>
            Solo puedes jugar una por turno, antes de los dados o en la fase de
            acciones. Las recién compradas esperan a tu siguiente turno. Puedes
            comprar varias si quedan cartas.
          </p>
          <ul>
            <li>
              <b>Caballero:</b> mueve el ladrón y roba, sin provocar descartes.
            </li>
            <li>
              <b>Carreteras:</b> coloca dos gratis, o las que permitan tus
              piezas y conexiones.
            </li>
            <li>
              <b>Abundancia:</b> toma dos recursos disponibles del banco,
              iguales o distintos.
            </li>
            <li>
              <b>Monopolio:</b> recibe de todos tus rivales todas las cartas de
              un recurso.
            </li>
            <li>
              <b>Victoria:</b> permanece oculta y cuenta al comprobar tus 10
              puntos, incluso recién comprada. No consume la carta jugable del
              turno.
            </li>
          </ul>
        </article>
        <article>
          <h3>07 · Los dos grandes premios</h3>
          <p>
            <b>Mayor ruta comercial:</b> 2 puntos a la ruta continua más larga,
            de al menos 5 carreteras. Cuenta un recorrido sin repetir aristas,
            incluyendo ciclos; los edificios rivales la interrumpen. Las
            bifurcaciones no se suman.
          </p>
          <p>
            <b>Mayor ejército:</b> 2 puntos a quien haya jugado al menos 3
            caballeros y supere a los demás. En ambos premios, el propietario
            conserva los empates. Si pierde la mayor ruta y otros empatan, queda
            sin dueño.
          </p>
        </article>
        <article>
          <h3>08 · Seis jugadores</h3>
          <p>
            Isla de 30 terrenos, 2 desiertos, 24 cartas por recurso y 34 cartas
            de desarrollo. Se usa el turno por parejas de la edición 2025:
            después del jugador principal actúa la tercera persona a su
            izquierda.
          </p>
          <p>
            La pareja no tira dados ni negocia con otros jugadores. Sí puede
            usar el banco, construir, comprar y jugar una carta, y ganar con 10
            puntos. Las cartas compradas en un turno se pueden jugar en el
            siguiente turno propio, como principal o pareja.
          </p>
        </article>
      </div>
      <div className="house-rules">
        <h3>8 y 10 jugadores · Variantes caseras</h3>
        <p>
          Estos modos adaptan el juego base y no son expansiones oficiales.
          Conservan los costes, el límite de 7 cartas, las piezas por jugador y
          la meta de 10 puntos. El equilibrio no está certificado.
        </p>
        <table>
          <thead>
            <tr>
              <th>Variante</th>
              <th>Terrenos</th>
              <th>Cartas por recurso</th>
              <th>Desarrollo</th>
              <th>Pareja</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>8 personas</td>
              <td>37 (2 desiertos)</td>
              <td>38</td>
              <td>50</td>
              <td>4 asientos después</td>
            </tr>
            <tr>
              <td>10 personas</td>
              <td>52 (2 desiertos)</td>
              <td>48</td>
              <td>68</td>
              <td>5 asientos después</td>
            </tr>
          </tbody>
        </table>
        <p>
          Distribución de madera / arcilla / lana / cereal / mineral: 8 / 6 / 7
          / 8 / 6 para ocho; 11 / 10 / 11 / 10 / 8 para diez. Puertos: 13 y 16.
          Fichas numéricas repartidas sin 6 u 8 adyacentes.
        </p>
      </div>
      <div className="rules-source">
        <b>Alcance y fuentes</b>
        <p>
          Incluye el juego base, CATAN para dos de Mercaderes y Bárbaros y la
          extensión de seis; no incluye Navegantes, Ciudades y Caballeros ni
          otras expansiones. La isla usa la alternativa aleatoria del reglamento
          base, conservando las cantidades de fichas y evitando 6 y 8
          adyacentes. Los textos son una explicación propia; no una reproducción
          del manual.
        </p>
        <a
          href="https://www.catan.com/sites/default/files/2025-04/CN3089%20CATAN%20%E2%80%93%20T%26B%20Rulebook.pdf"
          target="_blank"
          rel="noreferrer"
        >
          CATAN para dos · reglamento de referencia, páginas 7–8 ↗
        </a>
        <br />
        <a
          href="https://www.catan.com/understand-catan/game-rules"
          target="_blank"
          rel="noreferrer"
        >
          Consultar los reglamentos oficiales de CATAN ↗
        </a>
      </div>
    </Modal>
  );
}
