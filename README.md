# CATAN · Mesa local multijugador

Juego web en español construido con React, React Native Web y TypeScript. Cada persona juega desde su navegador en la misma red. El servidor Node.js con WebSocket valida todas las acciones y mantiene las salas en memoria. No necesita cuentas ni base de datos.

## Iniciar

Requisitos: Node.js 22.14 o superior y npm.

```sh
npm ci
npm run dev
```

- En el ordenador del servidor: `http://localhost:5173`.
- En los móviles: la dirección de red que muestra Vite, en la misma Wi-Fi. La sala genera un enlace de invitación con la dirección local; si hay varias interfaces de red puedes seleccionar la correcta.
- Crea una mesa, escribe tu nombre y comparte el código o enlace. El anfitrión inicia cuando todos los asientos están ocupados y conectados.
- Si Windows pregunta por acceso a red, permite Node.js en tu red privada para que entren los otros dispositivos. No hace falta configurar un router ni exponer puertos a Internet.

Las partidas desaparecen si se detiene o reinicia el servidor. Una recarga o una desconexión temporal recupera el asiento en la misma pestaña mediante una credencial guardada en `sessionStorage`. No se ofrece recuperación entre dispositivos, persistencia en disco, inteligencia artificial ni juego a través de Internet en esta versión.

## Modalidades

La mesa usa una **regla de tiempo personalizada**: 90 segundos por turno (incluidos dados y comercio); en preparación, 90 segundos por pareja de poblado y carretera. El ladrón dispone de 30 segundos para movimiento y robo, y cada jugador tiene 30 segundos por descarte. Estas decisiones pausan el presupuesto restante del turno. El servidor controla el reloj, mantiene el límite al reconectar y completa decisiones obligatorias al vencer; nunca acepta tratos ni compra piezas por el jugador.

La producción se entrega automáticamente y muestra un recibo público de las cartas producidas. La mano privada aparece bajo el tablero, con cartas ilustradas y costes que indican los recursos disponibles y faltantes. Los seis terrenos usan arte original generado; consulta `docs/arte-terrenos.md` para los prompts y `public/art/` para las imágenes WebP optimizadas. Los originales se conservan en `docs/art-sources/`.

| Jugadores | Tablero                              | Recurso / tipo | Desarrollo | Turnos                   |
| --------- | ------------------------------------ | -------------- | ---------- | ------------------------ |
| 2         | 19 terrenos, 1 desierto, 9 puertos   | 19             | 25         | Dos tiradas diferentes   |
| 4         | 19 terrenos, 1 desierto, 9 puertos   | 19             | 25         | Normal                   |
| 6         | 30 terrenos, 2 desiertos, 11 puertos | 24             | 34         | Parejas, separación 3    |
| 8         | 37 terrenos, 2 desiertos, 13 puertos | 38             | 50         | Adaptación, separación 4 |
| 10        | 52 terrenos, 2 desiertos, 16 puertos | 48             | 68         | Adaptación, separación 5 |

**8 y 10 son variantes caseras**, identificadas en la interfaz. No existe una extensión oficial del juego base para esos tamaños. Mantienen 10 puntos para ganar y 15 carreteras, 5 poblados y 4 ciudades por persona. Su equilibrio necesita partidas humanas.

El modo 4 implementa las mecánicas del juego base. El modo 6 añade los componentes y turnos por parejas de 2025. Se usa colocación inicial libre en serpiente y distribución aleatoria de números sin 6/8 adyacentes, alternativa descrita en el reglamento base. No se incluyen Navegantes, Ciudades y Caballeros, otras expansiones ni un tablero fijo para principiantes.

Reglas implementadas: costes y reservas de piezas, distancias y conexiones, ciudades, producción y escasez, siete y descartes, ladrón, robo aleatorio, puertos, comercio con el banco y entre jugadores con aceptación de la contraparte, cinco tipos de desarrollo, una carta por turno y antigüedad de las cartas, mayor ruta incluyendo ciclos/cortes/empates, mayor ejército, puntos privados, victoria solo en turno propio y revancha.

Fuentes: [reglamentos oficiales](https://www.catan.com/understand-catan/game-rules), [reglamento base y almanaque](https://www.catan.com/sites/default/files/2021-06/catan_base_rules_2020_200707.pdf), [extensión 5–6, edición 2025](https://www.catan.com/sites/default/files/2025-03/CN3082%20CATAN%20%E2%80%93%205-6%20Rulebook%202025%20reduced.pdf). Las explicaciones son propias; no se copian las ilustraciones o textos del juego. Proyecto de aficionados, sin afiliación oficial.

El modo de **2 jugadores** implementa CATAN para dos de Mercaderes y Bárbaros (2025): dos conexiones humanas, dos colores neutrales, dos producciones con resultados diferentes, construcción neutral tras cada carretera o poblado, 20 fichas de comercio con gasto una vez por turno, intercambio forzado con devolución privada, expulsión del ladrón y retirada de caballeros. Los neutrales nunca producen ni toman turnos; pueden obtener la mayor ruta. Se gana con 10 puntos. Referencias: [reglamento, páginas 7–8](https://www.catan.com/sites/default/files/2025-04/CN3089%20CATAN%20%E2%80%93%20T%26B%20Rulebook.pdf) y [preguntas frecuentes](https://www.catan.com/faq/traders-barbarians).

## Comprobar y compilar

```sh
npm test
npm run build
npm start
```

`npm start` sirve la compilación y las conexiones de la partida desde el puerto 3001. `PORT` permite cambiar ese puerto. En desarrollo, Vite usa 5173 y reenvía `/ws` y `/api` al servidor 3001. No se ha desplegado el proyecto.

Las pruebas cubren reglas, conservación de recursos, privacidad, acciones inválidas, reconexión, conexiones simultáneas para todos los tamaños y partidas simuladas completas hasta la victoria. Las simulaciones se usan solo como pruebas y no aparecen como oponentes en el juego.

## Organización

- `src/game/`: motor puro, grafo de tablero, inventarios y pruebas.
- `server/index.ts`: salas en memoria, credenciales de asiento, validación de turnos, revisión de estado y proyecciones privadas. El servidor es la autoridad; el cliente no determina dados, mazo ni recursos.
- `src/network.ts`: cliente WebSocket y reconexión.
- `src/App.tsx`: inicio y sala de espera.
- `src/GameScreen.tsx`: mano y acciones.
- `src/Board.tsx`: tablero SVG interactivo y zoom.
- `src/Rules.tsx`: ayuda completa en español y diferencias de las variantes.

React Native Web se utiliza para componentes de interfaz compartidos; SVG, elementos HTML semánticos y CSS responsive resuelven la interacción del navegador. Esto es una aplicación web, no un APK/IPA. La tipografía web tiene fuentes del sistema como alternativa cuando no hay Internet.

Para un futuro despliegue se necesitará alojamiento compatible con Node.js y WebSocket, HTTPS y persistencia si se quieren conservar partidas entre reinicios. El archivo `dist` por sí solo no sustituye al servidor de partidas.
