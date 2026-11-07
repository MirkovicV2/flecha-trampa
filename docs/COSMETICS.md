# Dirección visual y cofres

## Colección de flechas

El catálogo contiene 32 diseños vectoriales originales y 16 familias de animación. Cada pieza tiene silueta propia, caras, biseles, detalles de acabado y firma de movimiento. Las ocho piezas fundacionales de la serie 01 se conservan:

| Pieza        | Acabado               | Salida                   |
| ------------ | --------------------- | ------------------------ |
| Original     | Cerámica satinada     | Estela de precisión      |
| Doble filo   | Aluminio mecanizado   | Dos ecos paralelos       |
| Voltaje      | Carbono electrificado | Descarga quebrada        |
| Arcade       | Esmalte de 16 bits    | Bloques cuadrados        |
| Prisma       | Cristal tallado       | Fragmentos triangulares  |
| Órbita       | Titanio orbital       | Anillos orbitales        |
| Corona solar | Oro y ónice           | Sello y hojas de oro     |
| Supernova    | Aleación de plasma    | Ignición y estela triple |

`src/config/arrow-designs.ts` contiene las geometrías, tintas y firmas. Tanto SVG (`src/ui/arrow-art.ts`) como Phaser (`src/scenes/BoardScene.ts`) dibujan esos mismos puntos. El inspector permite probar la animación y comprobar las cuatro orientaciones, incluidas las piezas aún bloqueadas. Probar no desbloquea, no cobra fragmentos y no consume energía.

Las piezas esmaltadas conservan la paleta direccional en el cuerpo. Órbita, Corona solar y Supernova conservan su metal base y aplican esa paleta al núcleo y a los detalles. Las flechas apuntan mediante su silueta, sin depender del color. Las partículas y estelas se añaden por encima del renderizado; nunca desplazan las celdas ni sus áreas táctiles. Los cosméticos no modifican las reglas.

El lenguaje del taller utiliza carbón, metal, papel cálido, acentos de latón y etiquetas de serie. Barlow Condensed y Manrope se incluyen localmente con las licencias OFL en `public/fonts`; funcionan sin conexión. No se usan recursos de Counter-Strike ni de otros juegos.

La portada y las vistas previas de fondos muestran la misma pieza equipada. Los escenarios incorporan nieve, pétalos, burbujas, luciérnagas, trazos de neón o faroles: entre 8 y 16 elementos por escena. Las miniaturas permanecen estáticas; los ambientes del fondo se pausan detrás de un diálogo. El movimiento reducido suprime también estos efectos. No se ejecutan bucles JavaScript para los ambientes.

## Apertura de suministros

1. `ProgressStore.openChest()` sortea el premio real mediante `crypto.getRandomValues`, debita un cofre y guarda la propiedad o la compensación por duplicado.
2. `ChestOpening` presenta una secuencia finita: precinto (450 ms), carrusel (5.200 ms), parada (300 ms), revelación.
3. Los 44 espacios decorativos utilizan un generador separado. El espacio 35 contiene exactamente la pieza ya guardada. Cambiar el premio no fuerza rarezas especiales en los espacios vecinos. Las tarjetas restantes no alteran las probabilidades ni la garantía de rareza.
4. Un freno cúbico monótono controla los fotogramas y los clics. El puntero termina dentro de la tarjeta ganadora, con un desplazamiento pequeño y acotado. La rareza determina el acorde y el tratamiento del resultado.
5. «Equipar skin» aplica la pieza. La recompensa ya pertenece al jugador, aunque cierre o recargue antes.

Las probabilidades siguen siendo 60 % común, 28 % rara, 10 % épica y 2 % legendaria; cada décima apertura como máximo garantiza épica o superior. Los cofres se consiguen jugando y no se venden. No se añaden llaves, compra de cofres, temporizadores de venta ni cambios de probabilidades por tener el pase.

## Interrupciones y accesibilidad

- «Saltar animación» revela el resultado ya concedido. No repite el sorteo.
- Escape y Atrás de Android revelan primero; una segunda acción permite volver a la colección.
- Cambiar el ancho durante el giro revela la pieza para impedir desalineaciones.
- Pasar a segundo plano detiene audio, temporizadores y movimiento, y conserva el resultado.
- El modo de movimiento reducido, del sistema o del juego, omite el carrusel.
- El sonido puede activarse en la apertura y se guarda en los ajustes. Las vibraciones respetan su ajuste independiente; no se vibra por cada tarjeta.
- Las tarjetas decorativas están ocultas a lectores de pantalla. El resultado se anuncia una vez; el foco y las acciones permanecen dentro del diálogo.
- Cerrar el diálogo cancela las animaciones, el observador de tamaño, los fotogramas y las voces sintetizadas.

El carrusel usa Web Animations API y las salidas utilizan los tweens de Phaser 3.90. No hace falta otro motor de animación ni conexiones externas. Referencias técnicas: [Element.animate](https://developer.mozilla.org/en-US/docs/Web/API/Element/animate) y [Animation.finish](https://developer.mozilla.org/en-US/docs/Web/API/Animation/finish).

## Verificación

`tests/chest-reel.test.ts` comprueba premios, independencia de las tarjetas vecinas, frenado, aleatoriedad inválida y encuadre. `e2e/cosmetics.spec.ts` verifica los inspectores, filtros y celdas táctiles estables; `e2e/chests.spec.ts` cubre el giro real, doble pulsación, duplicados, saltos, Escape, cambio de tamaño, recarga y movimiento reducido. La prueba nativa de Android espera tanto el giro como la revelación antes de equipar.

## Ampliación 0.6

El catálogo conserva las ocho piezas anteriores y añade 24 matrices originales:

| Taller          | Piezas                                          | Firma nueva                                    |
| --------------- | ----------------------------------------------- | ---------------------------------------------- |
| Industrial      | Lanza, Ancla, Ala delta, Remache, Aguja, Cometa | Precisión, ecos, tensión, tinta, ondas, cintas |
| Criolaboratorio | Escarcha, Cero absoluto, Solsticio              | Seis agujas de hielo                           |
| Fundición       | Ascua, Caldera, Dragón imperial                 | Brasas y combustión                            |
| Casa de tinta   | Ronin, Shogun                                   | Cortes diagonales                              |
| Señal           | Circuito, Espectro                              | Bandas de desfase digital                      |
| Botánica        | Flor de acero, Sakura                           | Pétalos en espiral                             |
| Pelágico        | Marea, Abisal, Eclipse                          | Tres ondas concéntricas                        |
| Mítico          | Noche de brujas, Fénix                          | Estelas de meteoros                            |
| Celeste         | Aurora boreal                                   | Tres cintas ondulantes                         |

Las 16 familias se ejecutan también en Phaser, con un máximo de siete elementos adicionales por salida cosmética y vida finita de hasta 550 ms. Las flechas mantienen sus objetivos DOM inmóviles. El inspector permite probar las piezas bloqueadas y cancela sus animaciones al cerrarse. El movimiento reducido omite partículas y deja una transición breve de opacidad. La colección incorpora filtros por todas las rarezas. Las skins estacionales también salen en cofres y se crean con fragmentos; no tienen caducidad ficticia ni conceden energía.

El pase ampliado conserva temporada, XP y primeros diez niveles; añade vistas de premios, hitos gratuitos y navegación entre cuatro capítulos. Recoger una recompensa anima únicamente su tarjeta durante 700 ms. La transacción ocurre antes del efecto y no se repite al recargar.
