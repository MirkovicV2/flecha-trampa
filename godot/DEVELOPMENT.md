# Desarrollo Godot · 9 noviembre 2026

Entrega de implementación para QA/Revisión en `codex/godot-full-migration`, sin commit, push, merge ni acciones remotas. Se preservó el trabajo recuperado del mismo encargo: el coordinador confirmó por `msg_e5bf0123bfc8` que el trabajador anterior había salido y este dispatch era el único vivo.

Actualización de ronda QA 1: ver [corrección de paridad de skins](SKIN_PARITY_FIX.md) para tintas, paletas, firmas, previsualización, pruebas y APK actualizadas. Las limitaciones de herramientas del informe inicial son históricas; la ronda actual confirma plantillas y SDK disponibles y exportación correcta, sin prueba Android nueva.

## Qué se implementó y corrigió

Portada, mapa consultable, campaña y resultados, colección, especiales, modos anteriores y Ritmo comparten la misma escena Godot. El guardado es independiente del clásico; la entrada de Ritmo usa cuatro pads y reloj de reproducción de audio. Se mantienen clases de reglas y generador independientes de la representación.

Sobre el avance recuperado se repararon el fixture comercial incompleto, el contador clásico de piezas despejadas por especiales, la serialización exacta FT1 y la lectura de números JSON. Se reforzó la validación de geometría, número de piezas, vidas/errores, estado terminal, fechas UTC, modo de cada slot y UUID. Se añadió reconciliación de resultados terminales al reabrir, uso de reservas de cuarta vida, reintento del tablero/poder original, récords visibles, error de guardado de resultado sin éxito falso y cierre de diálogos de importación. Los contactos existentes y teclas mantenidas no se convierten en aciertos al reconstruir la pantalla; el foco de teclado desplaza tableros/mapa para mantenerse visible.

## Comprobaciones ejecutadas

- Huella íntegra del encargo: `100f78e2e262ec42e63d2a654cd785103e56ca8378f5bd8ef1c7e3a8186c0de7`. Guarda Node con ruta y branch ref exactas: `allowed:true`.
- Godot local: `4.7.2.stable.official.ed1daf0bf`; importación del editor correcta.
- `tests/arcade.gd`: **623 checks, cero fallos**. Fixtures comparativos exactos de generador/fallback y poderes comerciales; solver y extracción; ventanas inclusivas estándar/asistida; nota expirada una vez; calibración con offset positivo; presión progresiva; esquema, recuperación y fallos de escritura; importación cancelada/corrupta y checksum de origen intacto; códigos FT y FT1 byte exacto; diario repetido sin duplicar premios.
- `tests/arcade_ui.gd`: **78 checks, cero fallos** en escritorio con entrada sintética. Portada 320/390/428; mapa tap frente a drag de ida/vuelta; ficha separada; coste y continuación; long press/segundo dedo; victoria y premio idempotente; reapertura; inspección de 32 skins sin equipar; cuarto corazón/reintento; recuperación de resultado interrumpido; Ritmo, contactos, pausa/cuenta, reducción y campaña intacta tras Ritmo.
- Render con Compatibility/NVIDIA RTX 3060: capturas de portada, mapa, campaña, resultados y Ritmo; inspección visual de portada 320 y campo Ritmo. No se confunden estas capturas con Android.
- `npm ci --offline --no-audit --no-fund`: dependencias del lockfile desde caché, sin descargas. Node **24.22.1** local.
- `npm run check`: lint correcto, **156 tests en 19 archivos**, TypeScript y build Vite correctos. No cambió el runtime web; no se ejecutó Playwright porque las entradas afectadas son Godot y sus pruebas se ejecutaron en el motor.
- Formato y diferencias se comprueban antes de entregar; los logs finales están en `.artifacts/godot-arcade/`. No se instalaron herramientas, plantillas ni SDK.

## Evidencia local

Fuera del diff, en `.artifacts/godot-arcade/`:

- `walkthrough.avi`: vídeo automático de escritorio de 1343 frames a 30 FPS, **44,77 s**, 390×844. Campaña completa, vuelta al mapa, colección, Ritmo, combos, resultado y reintento. El audio de Ritmo está acelerado ×3 para la captura; la portada lo advierte. Las acciones son sintéticas y no constituyen una prueba humana del ritmo.
- `screens/`: PNG de portada 320/390/428, mapa, campaña y resultados. El campo Ritmo de la suite se captura tras inyectar un reloj de fixture y completar notas; el vídeo sí muestra notas en movimiento con transporte de audio.
- Informes finales y checksums acompañan el handoff del dispatch. Los artefactos ignorados deben conservarse o adjuntarse desde esta carpeta al continuar el pipeline; no existen como enlaces remotos publicados.

## Riesgos y gates pendientes

No hay APK: motor disponible, pero plantillas Android 4.7.2 y SDK no acreditados en el entorno asignado. No se instaló nada. No se probó emulador ni teléfono físico. La futura exportación debe usar `com.flechatrampa.godot.preview`, diferente de los paquetes clásicos.

QA debe valorar respuesta sonora real, calibración, tacto simultáneo, safe areas, foco/segundo plano, archivos nativos y lectura a 320 px en Android; Revisión debe comprobar todo el contrato después de QA. Los bucles y guardados probados en Windows no acreditan esos resultados. El cálculo frío del prefijo de poderes para una campaña muy avanzada sigue teniendo coste proporcional al nivel; continuar un intento guardado no lo recalcula.

El [inventario](PARITY.md) distingue puertos, pruebas locales y pendientes de paridad/acabado. La pantalla completa del pase y la ceremonia clásica de cofres quedan para el resto de migración; se conservan los datos y recompensas reclamadas. El movimiento reducido se controla en Ajustes, sin autolectura de preferencia del sistema. No se infieren derechos comerciales de perfiles importados ni se prueban con datos personales.

La consulta documental `initial-context-1-developer` devolvió `knowledge-e68977f747db6e7608b4d4a905a193c4`; sus fuentes eran contexto histórico y no se usaron como autorización ni evidencia de implementación. No se modificó la bóveda. Los SHA vigentes y la procedencia por sistema figuran en el inventario.
