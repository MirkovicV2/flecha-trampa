# Energía, pase y colección

## Energía

- 5 cargas iniciales; el límite de regeneración del Pase Plus verificado es 8.
- Comenzar un nuevo intento clásico o diario gasta una carga. Una victoria devuelve la carga de ese intento, una sola vez.
- Continuar una partida guardada no consume energía ni otra reserva de vida extra.
- Se regenera una carga cada 10 minutos, también con la app cerrada. No se acumula tiempo de recarga mientras el depósito está lleno.
- Las bonificaciones del pase pueden superar el límite de regeneración, con un máximo de 99 cargas guardadas.
- El tutorial y los retos compartidos no consumen energía. Cuando se agota, «Practicar sin energía» abre un reto con el mismo tablero y sin XP del pase.
- Cambiar el reloj hacia atrás no concede cargas. La hora local de un juego sin backend no constituye una protección contra trampas; una economía comercial necesitará un reloj y un inventario autorizados por servidor.

La energía y su referencia temporal se guardan con el resto del progreso. No depende de que un temporizador siga ejecutándose en segundo plano.

## Pase de temporada

Temporada `S1-CAMINOS`, diez niveles de 100 XP. Esta primera temporada no tiene fecha de cierre. Se conceden 100 XP por superar un nivel clásico nuevo y 150 XP por completar el diario por primera vez. Una victoria sin errores añade 25 XP. Repetir niveles ya superados, los retos compartidos y el tutorial no generan XP.

La ruta gratuita entrega energía, cofres, fragmentos, los temas Medianoche y Solar, dos reservas de vida extra y la skin legendaria Corona solar. Cada recompensa se recoge una sola vez y su identificador se persiste. Los resultados se reconcilian si la app se cierra durante la animación final, sin duplicar XP, energía o premios.

Las dos reservas del nivel 4 añaden una cuarta vida a los siguientes dos intentos clásicos nuevos, una por intento. No se consumen por continuar ni al intentar iniciar sin energía. Diario y retos compartidos siempre mantienen tres vidas. Con Pase Plus activo no se consumen estas reservas.

La segunda ruta y las ventajas de Pase Plus incluyen ocho cargas máximas de regeneración, cuatro vidas en cada intento clásico y omisión de intersticiales. La distribución interna ofrece un adaptador de prueba con pantalla de compra de 0,00 €, cancelación y restauración, siempre etiquetado sin cobro. Sus derechos se guardan aparte y no acreditan compras reales. Con `VITE_MONETIZATION_MODE=disabled`, los adaptadores NoOp mantienen anuncios y compra desactivados. Ver los límites y la configuración en [monetización](MONETIZATION.md).

## Cofres y skins

Hay un cofre inicial y más cofres en el pase. Los cofres se obtienen jugando y no se venden.

| Rareza     | Probabilidad base | Fragmentos por duplicado | Coste de creación |
| ---------- | ----------------- | ------------------------ | ----------------- |
| Común      | 60 %              | 2                        | 5                 |
| Rara       | 28 %              | 5                        | 15                |
| Épica      | 10 %              | 12                       | 40                |
| Legendaria | 2 %               | 30                       | 120               |

Si nueve aperturas seguidas no dan épica o legendaria, la décima garantiza una de esas rarezas. Un resultado épico o legendario reinicia el contador. En una apertura garantizada, el 2 % legendario se conserva y el resto pasa a épico; las probabilidades base ya no se aplican a común/rara. Se muestra el número máximo de aperturas restante.

La selección usa `crypto.getRandomValues`. La rareza se elige primero y luego una skin de esa rareza de manera uniforme. Original se entrega al inicio y no aparece en cofres. Hay ocho skins: Original, Doble filo, Voltaje, Arcade, Prisma, Órbita, Corona solar y Supernova. Los duplicados conceden fragmentos para crear directamente una skin concreta, sin otra tirada aleatoria. La apertura consume el cofre y guarda el resultado antes de mostrar la animación.

Aurora, Atardecer, Glaciar y Neón son temas gratuitos. Medianoche y Solar se consiguen en los niveles 3 y 8 de la ruta gratuita. Cambian paleta, fondo y tablero. Las skins cambian el dibujo vectorial de las flechas; todas conservan una punta y una dirección reconocibles.

Los escenarios de Navidad, Halloween, sakura, arcade, océano y faroles son una colección independiente de esos colores y de las skins. Se ganan con sellos gratuitos por progreso y no gastan ni otorgan energía. Se pueden previsualizar antes de desbloquearlos. Ver [fondos y eventos](EVENTS.md).

## Combos y entrada táctil

Los controles HTML mantienen su identidad entre jugadas. El motor procesa el movimiento antes de animarlo; las animaciones pueden solaparse y no bloquean otras flechas. Solo se bloquea temporalmente la flecha que acaba de fallar para evitar errores duplicados. Phaser se ocupa de dibujar y no registra otra fuente de entrada.

La selección usa Pointer Events al soltar el dedo, tolera 12 píxeles de movimiento y descarta arrastres, cancelaciones y pulsaciones largas. El click de compatibilidad no repite la jugada. Teclado, accesibilidad y clicks de WebView siguen disponibles. «Ampliar tablero» permite desplazarse por un tablero de al menos 500 píxeles para obtener objetivos de más de 44 píxeles incluso con diez columnas.

Los movimientos válidos separados por un máximo de 1,8 segundos forman una cadena. Un fallo, una pausa o el tiempo agotado la rompe. Se guarda la mejor cadena. El combo acelera la salida de flechas, aumenta partículas hasta un límite y eleva el tono del sonido; no altera las reglas ni concede dinero o XP adicional. La reducción de movimiento del sistema y del juego suprime estos efectos.

## Actualización desde 0.1.1

Se conserva la clave de guardado y se añaden valores iniciales cuando faltan los campos nuevos. La migración conserva tableros, vidas, ajustes, pistas, estadísticas y rachas. Una partida antigua que ya estaba iniciada continúa gratis. Las validaciones nuevas rechazan cantidades inválidas, cosméticos desconocidos y combinaciones de vidas inconsistentes.

Antes de habilitar una economía con pagos: integrar tienda, restauración y verificación de recibos; definir productos y duración del pase; añadir persistencia autorizada por servidor y resolver concurrencia entre dispositivos. Ver [monetización](MONETIZATION.md). En esta versión todo el progreso es local y no existe un ranking global.
