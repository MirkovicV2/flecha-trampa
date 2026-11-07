# Changelog

## 0.6.0 — 2026-11-07

- Catálogo de 32 skins: 24 matrices originales nuevas, ocho familias adicionales de salida (16 en total), materiales y efectos compartidos entre inspector y Phaser. Filtros para cada rareza.
- Pase ampliado sin reinicio a 40 niveles y 80 recompensas; 23 skins garantizadas entre ambas rutas, cofres, sellos, fragmentos, pistas y vidas. Hitos ilustrados, capítulos y feedback al recoger; duplicados garantizados compensados.
- Revisión opcional `chain-v2`: cadenas profundas, densidad creciente y análisis de celdas encerradas. Comparador reproducible `npm run balance`, 600 semillas adicionales verificadas y FT3 compatible con guardados nuevos. FT1, FT2 y diario anteriores conservados.
- Suministro gratuito permanente: un cofre por cada cinco niveles clásicos nuevos, incluso después de completar el pase, sin duplicados por recarga ni devolución de energía.
- Los intentos nuevos mantienen su coste energético al ganar o perder. Continuar y practicar siguen gratis; se respeta el reembolso único de intentos anteriores.
- APK 0.6.0 / código 7 con el mismo certificado de actualización. Prueba nativa ampliada para reclamar el nivel 40, equipar Fénix y recrear un reto táctico.

## 0.5.0 — 2026-11-07

- Referencias oficiales de Slide Arrows Match y Arrow Slide Puzzle documentadas, conservando reglas y recursos originales.
- Tableros deterministas en cuadrícula, diamante, cruz, órbita y reloj de arena, con generación inversa y fallback válido para cada máscara.
- Nuevos clásicos con formas desde el nivel 3 y selector de forma en retos compartidos. Enlaces, parámetros y guardados anteriores conservan compatibilidad.
- Inspección de rutas al mantener pulsado 420 ms; soltar, arrastrar o cancelar no ejecuta un movimiento. Modo Rutas accesible mediante botones y teclado.
- Colisión hasta el primer bloqueador y destellos de caminos recién liberados. Cabecera compacta y objetivos inmóviles incluso durante la pulsación.
- Una, dos y tres estrellas según victoria, ausencia de errores y de pistas; mejor combo por intento y victorias de tres estrellas persistentes, sin duplicar resultados.
- Registro de pistas atómico con su consumo, migración conservadora de partidas antiguas y versión de interfaz tomada de package.json.
- Apertura de enlaces de retos en la misma página corregida.
- Pruebas de 400 semillas con máscaras y 500 fallbacks rectangulares; recorridos de inspección, restauración y dominio en móvil y escritorio.
- Android `versionCode 6`; segunda prueba nativa para rutas y desafíos con máscara, con la misma firma de actualización.

## 0.4.0 — 2026-11-07

- Cofres con precinto, carrusel de 44 tarjetas, frenado, clics sincronizados y revelación por rareza; resultado guardado antes de animar.
- Saltar, Atrás, Escape, rotación, segundo plano y recarga conservan el premio sin repetir consumos o compensaciones.
- Ocho siluetas originales con caras, biseles y materiales compartidos entre SVG y Phaser. Metal base y núcleo de color en las ediciones especiales.
- Firmas de salida propias: precisión, doble eco, electricidad, píxeles, cristal, órbitas, oro y plasma.
- Colección renovada con fichas de taller, inspector animado, comprobación de orientaciones y filtros funcionales.
- Nueva portada con la pieza equipada y tipografías locales Barlow Condensed y Manrope bajo licencia OFL.
- Ambientes de nieve, pétalos, burbujas, luciérnagas, neón y faroles; miniaturas estáticas, pausa tras modales y respeto del movimiento reducido.
- Inicio de partida vuelve a la parte superior; encabezados compactos y áreas táctiles conservadas.
- Nuevas pruebas de integridad del carrusel, inventario, animaciones, interrupciones y navegación estrecha; Android prueba giro y revelación reales.
- Android `versionCode 5`, misma identidad y certificado de actualización, sin reinicio del progreso ni cambios en probabilidades o monetización.

## 0.3.0 — 2026-11-07

- Seis escenarios originales de Navidad, Halloween, sakura, neón, océano y faroles, independientes de skins y paletas.
- Galería con vistas previas y desbloqueo gratuito mediante sellos de progreso; persistencia compatible con la APK anterior.
- Anuncios de prueba etiquetados, cancelación sin recompensa, energía/pistas tras completar y recoger, intersticiales entre victorias.
- Pantalla de compra del Pase Plus de prueba a 0,00 €, activación de ventajas, restauración y restablecimiento. Sin cobros, tarjetas, anunciantes o SDKs comerciales.
- Combos con cinco etapas, medidor, estelas, ondas, carteles de racha, partículas de pantalla y tono/vibración ascendentes; limpieza al pausar y reducción de movimiento.
- Se conservan la geometría táctil y la firma de actualización Android. Versión Android 4.
- Nuevas pruebas de escenarios, compras/anuncios, segundo plano, persistencia, partículas acotadas y controles estables.
- Renderizado suspendido detrás de los modales, reanudación de animaciones en curso y limpieza de escenas dormidas.

## 0.2.0 — 2026-11-07

- Corrección táctil: controles estables, selección al soltar, rechazo de arrastres y pulsaciones simultáneas sin bloqueo global del tablero.
- Ampliación del tablero para mejorar los objetivos táctiles en diez columnas.
- Combos, animaciones simultáneas más rápidas, partículas acotadas, tono ascendente y mejor cadena guardada.
- Energía persistente, recarga temporal, devolución al ganar y práctica gratuita sin energía.
- Pase gratuito de diez niveles con XP, recompensas únicas y reservas de vida extra funcionales.
- Ocho skins con rarezas, cofres gratuitos, probabilidades visibles, garantía épica y creación con fragmentos de duplicados.
- Seis temas completos del juego, selección y persistencia de apariencias.
- Preparación de Pase Plus verificado, sin anuncios ni compras reales.
- Migración compatible con partidas de la APK anterior, versión Android 3 y firma de actualización conservada.

## 0.1.1 — 2026-11-06

- APK Android release universal, firma de prueba persistente y descarga desde GitHub Releases.
- Proyecto Android versionado, SDK 36, Java 21 y Gradle 8.14.3 con comprobación de checksum.
- Icono y lanzamiento originales, orientación vertical y zonas seguras de Capacitor 8.
- Compilación y firma locales con claves excluidas de Git, verificación de APK y SHA-256.
- CI Android con lint nativo, APK release y prueba de arranque, guardado, recuperación y botón Atrás en emulador.
- Sincronización de GitHub limitada a la cuenta activa y a los comandos del proyecto.
- Repositorio privado publicado en `MirkovicV2/flecha-trampa`, con ramas y etiqueta original `v0.1.0`.
- Ejecución manual de CI y documentación de autenticación y protección de ramas.

## 0.1.0 — 2026-11-06

Primera versión jugable del MVP web FLECHA TRAMPA.

- Motor puro de cuatro direcciones, tres vidas, victoria y derrota.
- Generación inversa determinista, solver independiente, progresión hasta 10 × 10 y fallback válido.
- Interfaz móvil y escritorio, tutorial interactivo, animaciones Phaser, partículas, pausas y resultados.
- Pistas reales, sonidos originales opcionales, vibración, reducción de movimiento y dos paletas gratuitas.
- Modo clásico con continuación, desafío diario UTC con rachas y retos compartidos por enlace.
- Estadísticas, guardado validado con copia de recuperación y protección frente a pestañas antiguas.
- Adaptadores de Capacitor Preferences, App y Haptics; configuración Android/iOS y plantilla de privacidad.
- NoOp para anuncios y compras, con límites de integración y documentación de monetización futura.
- TypeScript estricto, ESLint, Prettier, Vitest, Playwright y CI con Node 24.

No hay binarios nativos, anuncios, pagos, ranking global ni publicación en tiendas. La sincronización inicial con GitHub se completó posteriormente al autenticar la cuenta indicada; la etiqueta `v0.1.0` conserva su commit original.
