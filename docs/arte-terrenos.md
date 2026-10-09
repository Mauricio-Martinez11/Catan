# Arte de los terrenos

Seis ilustraciones originales generadas con la herramienta integrada ImageGen. Se usan tanto en los hexágonos como en las cartas de recursos. Los ejemplos del usuario sirvieron de orientación visual; no se han reutilizado sus imágenes como texturas.

Los archivos finales están en `public/art/`: `wood.webp`, `brick.webp`, `wool.webp`, `grain.webp`, `ore.webp` y `desert.webp`.

Los PNG originales se conservan en `docs/art-sources/`. Para la web se codificaron a WebP de 768 × 768 píxeles con calidad 84: aproximadamente 1,2 MB entre las seis ilustraciones, frente a 18,7 MB de originales.

## Puertos y muelles

Los veleros, embarcaderos y cinco iconos de carga se dibujan con SVG original en `src/Harbor.tsx`. Los muelles siguen la dirección de cada costa y conectan los dos vértices del puerto. Las velas muestran el recurso entregado y `2:1`, o `?` y `3:1` para los puertos generales. Se pueden tocar o activar con Enter/Espacio para leer el intercambio y el requisito de construcción. En móvil los controles de zoom quedan debajo de los barcos.

Referencia visual consultada: [fichas de puerto con barcos de CATAN](https://www.ebay.com/itm/294811984161). No se incluyen imágenes descargadas de esa referencia. Reglas de intercambio: [FAQ oficial del juego base](https://www.catan.com/faq/basegame).

Los nombres de los terrenos se mantienen en las etiquetas accesibles y en la leyenda exterior; los hexágonos sólo muestran su ilustración y ficha numérica.

## Prompts utilizados

### wood

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game; also reused as resource-card artwork. Create a beautiful hand-painted miniature landscape viewed from nearly overhead, with warm gouache texture, tactile board-game charm, crisp readable forms at thumbnail size, subtle realistic depth and soft sunlight from upper left. Subject: a dense emerald green forest of large rounded deciduous trees mixed with tall pines, a winding earthy trail, a small group of cut logs near the lower right. Forest must be immediately recognizable. Full-bleed square image, no border, no hexagonal outline, no letters, numbers, labels, icons, badges, UI, buildings, people, watermark or logos. Terrain fills all edges. Important trees and logs distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Rich forest greens, natural ochre path, detailed but clean rather than photographic. This is a new original illustration, not a copy of any commercial board-game tile. Square 1024x1024.

### brick

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game, also reused as resource-card artwork. Hand-painted miniature landscape viewed from nearly overhead, warm gouache texture, tactile board-game charm, crisp large readable forms at thumbnail size, subtle depth and soft sunlight from upper left. Full-bleed square image, no border, no hexagonal outline, no text, numbers, badges, icons, UI, people, buildings, watermarks or logos. Terrain fills all edges. Important recognizable details distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Original art, not a copy of commercial game artwork. Square 1024x1024. Subject: Warm terracotta clay hills and a small open red-clay quarry with striking layered russet earthen terraces, sandy paths, sparse olive grass tufts and a clearly visible few stacked red clay bricks near the lower right. Distinctive orange-red mineral landscape. No trees or mountains dominating.

### wool

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game, also reused as resource-card artwork. Hand-painted miniature landscape viewed from nearly overhead, warm gouache texture, tactile board-game charm, crisp large readable forms at thumbnail size, subtle depth and soft sunlight from upper left. Full-bleed square image, no border, no hexagonal outline, no text, numbers, badges, icons, UI, people, buildings, watermarks or logos. Terrain fills all edges. Important recognizable details distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Original art, not a copy of commercial game artwork. Square 1024x1024. Subject: A lush lime-green rolling meadow with several LARGE clearly recognizable fluffy white sheep grazing in groups around the periphery, little white daisies, gentle grassy slopes, short wooden fence segments. A bright pastoral grazing landscape, not a forest. Pale spring greens, cream sheep, warm sunlight. Sheep must remain recognizable at small tile size.

### grain

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game, also reused as resource-card artwork. Hand-painted miniature landscape viewed from nearly overhead, warm gouache texture, tactile board-game charm, crisp large readable forms at thumbnail size, subtle depth and soft sunlight from upper left. Full-bleed square image, no border, no hexagonal outline, no text, numbers, badges, icons, UI, people, buildings, watermarks or logos. Terrain fills all edges. Important recognizable details distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Original art, not a copy of commercial game artwork. Square 1024x1024. Subject: Golden wheat farmland, ripe rows of ochre grain following curved contours, small dirt paths, several tied wheat sheaves and a few straw hay bales around the periphery. Sunlit yellow-gold countryside, clearly agricultural wheat, no green forest, no buildings.

### ore

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game, also reused as resource-card artwork. Hand-painted miniature landscape viewed from nearly overhead, warm gouache texture, tactile board-game charm, crisp large readable forms at thumbnail size, subtle depth and soft sunlight from upper left. Full-bleed square image, no border, no hexagonal outline, no text, numbers, badges, icons, UI, people, buildings, watermarks or logos. Terrain fills all edges. Important recognizable details distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Original art, not a copy of commercial game artwork. Square 1024x1024. Subject: A rugged cluster of massive slate-gray rocky mountain peaks and angular cliffs, cool gray stone with subtle silver mineral veins, gravel paths, and a few large ore boulders around the lower edge, sparse moss at the foot. Strong craggy silhouettes, gray-blue stone dominates, no snow covering the stone, no trees dominating.

### desert

Use case: stylized-concept. Asset type: original square terrain illustration for a digital hexagonal board game, also reused as resource-card artwork. Hand-painted miniature landscape viewed from nearly overhead, warm gouache texture, tactile board-game charm, crisp large readable forms at thumbnail size, subtle depth and soft sunlight from upper left. Full-bleed square image, no border, no hexagonal outline, no text, numbers, badges, icons, UI, people, buildings, watermarks or logos. Terrain fills all edges. Important recognizable details distributed around the image, leaving a slightly quieter small area at the exact center for a number token added in code. Original art, not a copy of commercial game artwork. Square 1024x1024. Subject: Sunlit warm golden sand dunes with graceful curved ridges and wind ripples, a few small sandstone rocks, sparse dry desert shrubs near the periphery. Sandy beige and amber palette, empty arid desert landscape. No water, no oasis, no buildings, no vegetation covering the dunes.
