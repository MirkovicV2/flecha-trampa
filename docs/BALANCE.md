# Balance de progresión

## Dificultad reproducible

La comparación de dificultad corresponde a 0.5 frente a 0.6; la versión 0.7 conserva ese generador y ajusta el suministro y la apertura de cofres.

Ejecutar `npm run balance` con Node 24. El script compila los módulos puros en `.artifacts/balance-modules/`, genera 100 semillas por tramo con los parámetros clásicos de 0.5 y 0.6 y escribe `.artifacts/difficulty-060.json`. Usa exactamente las mismas semillas `balance-060-0` a `balance-060-99` en cada comparación. No usa el perfil del jugador ni recursos de pago.

| Niveles | Flechas medias, antes → ahora | Profundidad, antes → ahora | Salidas iniciales, antes → ahora |
| ------- | ----------------------------- | -------------------------- | -------------------------------- |
| 2–5     | 9,50 → 11,50                  | 4,18 → 7,57                | 53,15 % → 30,55 %                |
| 6–15    | 19,20 → 22,90                 | 6,25 → 13,32               | 46,13 % → 27,04 %                |
| 16–30   | 28,71 → 33,79                 | 7,69 → 17,11               | 45,29 % → 29,22 %                |
| 31–60   | 36,79 → 42,00                 | 8,16 → 19,77               | 44,18 % → 27,54 %                |
| 61–150  | 54,51 → 59,70                 | 8,13 → 25,68               | 41,44 % → 26,90 %                |

La profundidad es la cadena más larga de bloqueos medida por el solver. El porcentaje cuenta flechas que pueden salir al empezar. Ninguna métrica predice la tasa de derrota, ingresos o retención: hace falta probar con jugadores y móviles físicos. Los tiempos medidos en el PC de desarrollo fueron 0,48–12,76 ms por tablero nuevo; variarán según el equipo.

Los 500 tableros de esta comparación son solucionables y ninguno necesitó fallback. La suite automática verifica además 600 semillas nuevas con determinismo, solver independiente y ejecución de cada movimiento en el motor; mantiene las pruebas del generador anterior y fuerza el fallback en máscaras pequeñas y grandes.

El primer nivel permite aprender; desde el segundo, `chain-v2` combina profundidad de cadena, presión de trayectorias y espacio futuro. Antes de insertar, limita las celdas vacías encerradas por cuatro líneas ocupadas según el presupuesto de huecos. La densidad crece de forma independiente del tamaño, hasta 96 %. Conserva los tamaños 4–10 y las cinco máscaras. El solver sigue verificando cada candidato, hay cuatro intentos como máximo y un fallback válido.

Las partidas guardadas conservan su tablero y reglas. El generador sin `tuning` no cambia: diarios UTC, FT1 y FT2 mantienen sus semillas. FT3 incorpora la revisión para impedir que APK antiguas la ignoren. En retos compartidos se puede elegir «Maestro · Cadenas largas» y densidad extrema del 95 %.

## Energía y recompensas

Un intento clásico o diario nuevo cuesta una carga aunque se gane. Con cinco cargas se pueden iniciar cinco partidas inmediatas sin recompensas o regeneración. Continuar es gratis, y la recarga permanece en una cada diez minutos. No se retiran cargas acumuladas ni se cobra retroactivamente. Un intento guardado por una versión anterior conserva su único reembolso prometido al ganar.

El tutorial y la práctica compartida siguen disponibles sin energía, vidas compradas ni XP del pase. Las colisiones cuestan una vida real; no hay errores ocultos, bloqueos imposibles ni ajuste de dificultad según compras, inventario o energía. Las opciones de rutas, movimiento reducido y tacto se conservan.

El pase tiene 40 niveles de 100 XP y 80 recompensas; se conservan los XP, skins, temporada y premios ya reclamados. No se reinician temporada ni compras de prueba. Los nuevos niveles espacian las bonificaciones energéticas y ofrecen principalmente skins, cofres, fragmentos, pistas, reservas de vida y sellos para fondos. Todas las skins se obtienen también en cofres ganados jugando o por creación, sin venta de cofres. Los niveles clásicos nuevos 15, 30, 45 y sucesivos conceden un cofre de forma indefinida, también después del pase. El resultado lo muestra y se persiste antes de animar; repetir o recargar no duplica el premio. El inventario admite hasta 999 cofres. Estos hitos no conceden energía. Desde 0.7, los paquetes del pase dan un cofre cada uno: 9 gratuitos y 12 Plus, frente a los 20 y 41 anteriores. Abrir requiere un cofre y una llave, forjada cada cinco victorias nuevas; el primer diario del día también suma. La llave inicial y los recursos guardados se conservan al actualizar. La práctica, las repeticiones y las derrotas no generan forja; el pase no omite el coste. La economía sigue siendo local y no autoriza compras reales. Ads y Pase Plus continúan siendo simulaciones identificadas, sin cobro real.
