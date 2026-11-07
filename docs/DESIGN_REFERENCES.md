# Referencias y dirección de juego

Consulta: 7 de noviembre de 2026. Se revisaron las fichas oficiales y sus capturas públicas. No se instalaron los juegos de referencia ni se midieron su rendimiento o retención. Los recursos de esas capturas no se incluyen en el juego.

## Referencias

- [Slide Arrows Match, Google Play](https://play.google.com/store/apps/details?id=com.arrow.ninetyfour.gp): tap para liberar, tres vidas y líneas de dirección según su ficha. Sus capturas dan prioridad al espacio del tablero y a las puntas de flecha. Algunas piezas de las capturas tienen recorridos largos; FLECHA TRAMPA conserva la regla original de una celda por flecha.
- [Arrow Slide Puzzle, Google Play](https://play.google.com/store/apps/details?id=com.cleverapps.arrowsaway): la ficha propone despejar el campo para revelar imágenes; las capturas usan recorridos curvos con cabezas bien diferenciadas. Inspira variedad de composición, sin reutilizar dibujos, niveles o interfaz.
- [Arrow Slide: Puzzle Game, página del desarrollador](https://alkyo.itch.io/arrow-slide): combina secuencia lógica y combos. FLECHA TRAMPA ya tenía combos antes de esta revisión; se mantienen como una capa de ritmo sobre reglas estables.

## Aplicación en FLECHA TRAMPA

| Necesidad                                   | Decisión implementada                                                                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Leer un bloqueo sin acertar por casualidad  | Mantener pulsado 420 ms muestra el recorrido hasta el primer obstáculo. Soltar tras inspeccionar no ejecuta un movimiento. Botón Rutas para ratón, teclado y tecnologías de asistencia. |
| Saber dónde ocurrió el error                | Línea de colisión, marco en el primer bloqueador y pulso en la pieza correspondiente. La vida se descuenta una sola vez en el motor.                                                    |
| Notar que un movimiento ha abierto opciones | Destello breve solo en las flechas que pasan de bloqueadas a libres; posiciones táctiles inmóviles.                                                                                     |
| Variedad de composición                     | Cuadrícula, diamante, cruz, órbita y reloj de arena. Nuevos niveles clásicos alternan formas desde el nivel 3; los retos permiten elegirlas.                                            |
| Una partida clara en vertical               | Cabecera más compacta, geometría del tablero identificada, controles de ruta y zoom accesibles, respeto de zonas seguras.                                                               |

Las máscaras restringen dónde se colocan las piezas. Un hueco de la silueta no es una pared: una trayectoria sigue hasta el borde rectangular y puede encontrar un bloqueo al otro lado del hueco. El algoritmo inverso y el solver mantienen esa misma regla. La densidad se aplica a las celdas de la máscara, separada de la complejidad.

El generador rectangular `inverse-v1` conserva sus resultados. `shape` es un parámetro opcional y validado: su ausencia significa el tablero anterior. La fecha UTC del diario sigue usando sus parámetros originales. No se regeneran los guardados existentes. Nuevos guardados y enlaces conservan la máscara completa.

Los cosméticos originales, cofres y progresión continúan disponibles. La referencia visual orienta decisiones concretas de legibilidad y ritmo; no demuestra por sí sola que el juego tenga mejor retención o calidad que otros productos. Esa comparación requiere sesiones con jugadores y pruebas en teléfonos físicos.
