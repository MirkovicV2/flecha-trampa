# Dirección visual y cofres

## Colección de flechas

Los ocho diseños de la serie 01 son ilustraciones vectoriales originales. Cada uno tiene una silueta propia, caras, biseles, detalles de acabado y una firma de movimiento:

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

Los biseles conservan la paleta direccional del jugador. Las flechas apuntan mediante su silueta, sin depender del color. Las partículas y estelas se añaden por encima del renderizado; nunca desplazan las celdas ni sus áreas táctiles. Los cosméticos no modifican las reglas.

El lenguaje del taller utiliza carbón, metal, papel cálido, acentos de latón y etiquetas de serie. Barlow Condensed y Manrope se incluyen localmente con las licencias OFL en `public/fonts`; funcionan sin conexión. No se usan recursos de Counter-Strike ni de otros juegos.

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
