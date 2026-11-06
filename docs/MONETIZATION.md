# Preparación de monetización

El MVP utiliza `NoOpAdsService` y `NoOpPurchasesService`: no contacta redes publicitarias, no cobra y no concede recompensas por anuncios inexistentes. Aurora y Atardecer son paletas gratuitas. Las tres pistas iniciales y la pista por cada tres victorias son recompensas del juego.

`AdsService` separa la disponibilidad y la presentación de anuncios del motor. `MonetizationService.rewardedHint()` concede una pista únicamente al recibir un resultado `rewarded` con identificador nuevo, y rechaza peticiones simultáneas. `betweenLevels()` se invoca desde la transición de una victoria clásica; no se ejecuta durante el tablero. Respeta el derecho `adsRemoved` de `PurchasesService`. Los identificadores deduplicados en memoria son una primera barrera: un proveedor real deberá persistir y validar sus recibos.

Para integrar AdMob:

1. Elegir un adaptador de Capacitor compatible con la versión instalada y revisar su mantenimiento y permisos. Un candidato es [capacitor-community/admob](https://github.com/capacitor-community/admob).
2. Crear aplicaciones Android/iOS y unidades en AdMob. Configurar manifiestos nativos, identificadores y dispositivos de prueba. Durante desarrollo utilizar las unidades de prueba oficiales; no producir tráfico de prueba contra anuncios reales. [Guía de anuncios recompensados de Google](https://developers.google.com/admob/android/rewarded).
3. Integrar UMP, actualizar el estado de consentimiento en cada inicio, presentar el formulario cuando proceda y comprobar `canRequestAds` antes de solicitar anuncios. Ofrecer acceso a las opciones de privacidad cuando sea requerido. [Guía UMP de Google](https://developers.google.com/admob/android/privacy).
4. Traducir al resultado `rewarded` únicamente el evento oficial de recompensa ganada. Cerrar, cancelar, fallar o no disponer de inventario no otorga pistas. Probar carga, cierre, segundo plano y doble pulsación en dispositivos reales.

Para compras futuras: registrar productos para quitar anuncios y temas cosméticos en las tiendas; implementar compra, cancelación, restauración y validación de recibos antes de habilitar botones o precios. No confiar en una bandera editable de `localStorage` para conceder derechos de pago. Revisar las [políticas de Google Play](https://play.google.com/about/developer-content-policy/) y las [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/).

Antes de publicar con SDK publicitario, completar política de privacidad, declaraciones de datos y clasificación por edades según la distribución real. Si existe seguimiento en iOS, cumplir las condiciones aplicables de ATT y las declaraciones de la tienda. [Privacidad y uso de datos de Apple](https://developer.apple.com/app-store/user-privacy-and-data-use/).
