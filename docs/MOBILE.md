# APK Android e iOS

Capacitor 8 está configurado con `com.flechatrampa.game`, `FLECHA TRAMPA` y `dist`. El proyecto `android/` está versionado. El juego usa Preferences en nativo, pausa y guarda al pasar a segundo plano, integra Haptics y atiende el botón Atrás. CSS combina las zonas seguras del navegador con las variables de SystemBars de Capacitor 8.

## Descargar desde el móvil

Abrir la [Release v0.1.1](https://github.com/MirkovicV2/flecha-trampa/releases/tag/v0.1.1) con una cuenta que tenga acceso al repositorio privado. En GitHub Mobile: Releases → v0.1.1 → Assets → `flecha-trampa-v0.1.1-android.apk`. Descargar el archivo y seguir el instalador de Android. También se incluyen `SHA256SUMS.txt` y la información pública del certificado de firma.

Es una APK universal de tipo release para Android 7.0/API 24 o posterior, con WebView actualizado. Incluye los archivos del juego y permite jugar clásico y diario sin conexión. No necesita cuentas dentro del juego. Es una distribución de prueba propia, sin anuncios, pagos ni publicación en Google Play.

## Herramientas en este ordenador

Windows conserva su Java global 19.0.2 y Node global 20.10.0. Las herramientas del proyecto están aisladas en `.tools/`, fuera de Git:

- Node 24.22.2 y GitHub CLI 2.103.3.
- Eclipse Temurin JDK 21.0.13+9, verificado mediante el SHA-256 oficial de Adoptium.
- Herramientas de línea de comandos de Android `15859902`, verificadas mediante el SHA-256 oficial de Google.
- SDK Platform 36, Build Tools 35.0.0 y 36.0.0, y platform-tools/adb.
- Gradle Wrapper 8.14.3, con checksum de la distribución fijado en el proyecto.

La compilación de línea de comandos no necesita instalar Android Studio. Para editar visualmente el proyecto puede usarse Android Studio compatible con Capacitor 8. Ver [requisitos de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup) y [migración a Capacitor 8](https://capacitorjs.com/docs/updating/8-0).

## Android

En este PC, desde la raíz del proyecto:

```powershell
. .\scripts\use-android-tools.ps1
npm run android:apk
```

El comando valida lint, tests y build web, sincroniza Capacitor, ejecuta lint nativo, compila release y las pruebas instrumentadas, firma la APK y verifica firma, alineación, identidad, versión y presencia de los archivos del juego. La salida está en `.artifacts/releases/`. No ejecuta pruebas en un dispositivo físico automáticamente.

En otro equipo, instalar Node 24, JDK 21 y SDK 36; `npm ci`, `npm run build` y `npx cap sync android`. Desde `android/`, ejecutar `./gradlew :app:lintRelease :app:assembleRelease`. Ese resultado es una APK sin firmar; necesita una firma para instalarse. No volver a ejecutar `cap add android`, porque la plataforma ya existe.

## Firma y actualizaciones

`scripts/sign-android.mjs` crea una clave RSA privada de prueba en `.tools/android-signing/internal-release.p12` y una contraseña aleatoria en `.tools/android-signing/credentials.json`. La contraseña se transmite a las herramientas por entorno, sin incluirla en comandos o logs. Las claves y credenciales no se envían a GitHub. Conservar una copia segura de esta carpeta fuera del repositorio.

La misma clave permite instalar futuras APK como actualización y conservar el progreso. Perderla obliga a usar otra firma, lo que puede requerir desinstalar y perder los datos locales. Una clave existente nunca se sustituye automáticamente. Las compilaciones `debug` de desarrollo utilizan otra firma; para probar las actualizaciones de esta distribución, utilizar siempre las APK release publicadas.

La versión Android 0.1.1 utiliza `versionCode 2`. Incrementar `versionCode` y `versionName` en `android/app/build.gradle`, junto con `package.json` y su lockfile, para una nueva versión. Antes de una publicación de tienda, preparar la firma de producción y Google Play App Signing.

## Pruebas Android

El workflow [Android APK](../.github/workflows/android.yml) compila y analiza el proyecto con JDK 21. Después inicia un emulador API 35 y ejecuta `NativeGameSmokeTest` en la variante release: comprueba el WebView con el juego empaquetado, zonas seguras, pulsaciones táctiles nativas, Preferences reales, pistas, recuperación tras recrear la actividad y el botón Atrás. Wi-Fi y datos del emulador se desactivan durante la prueba. Conserva informes y una captura del tablero; esa captura se escribe en el área de imágenes del emulador para sobrevivir a la limpieza de los datos de la app al terminar.

El candidato release y su APK de pruebas se firman para la instrumentación con una clave efímera del runner. Esa clave temporal no se publica ni sirve para las actualizaciones de los usuarios. El instalador descargable utiliza la firma persistente local, comprobada con `apksigner` y `zipalign`, y se publica en Releases. El workflow conserva el candidato sin firmar y los informes, sin claves.

No se ha realizado validación en un teléfono físico. Revisar allí bordes del sistema, vibración, sonido, segundo plano, actualización conservando datos y comportamiento del fabricante. Android 16 puede ignorar el bloqueo vertical en pantallas grandes; la interfaz sigue siendo responsive.

## iOS

En un Mac con las herramientas necesarias:

```sh
npm ci
npm run build
npx cap add ios
npm run cap:sync
npm run cap:ios
```

Se necesitan macOS, Xcode 26 o posterior y sus herramientas. Configurar equipo de firma, identificador definitivo, orientación vertical, iconos y lanzamiento en Xcode. Añadir el manifiesto de privacidad a la app y verificar su pertenencia al target. [Preferences requiere declarar UserDefaults; Capacitor recomienda el motivo CA92.1](https://capacitorjs.com/docs/apis/preferences). Se incluye una plantilla en `templates/PrivacyInfo.xcprivacy`; integrarla con cualquier manifiesto existente, sin reemplazar otras declaraciones. No se ha compilado un IPA.

## Enlaces públicos y tiendas

Configurar `VITE_PUBLIC_URL` antes del build nativo: la dirección interna `https://localhost` no permite que otra persona abra un reto. El MVP incluye URLs web reproducibles. Los Universal Links/App Links que abren la app instalada requieren dominio propio y configuración adicional nativa.

Preparar política de privacidad, clasificación por edades, formularios de datos y fichas de tienda según el producto real. Actualmente no hay SDK publicitario, compras ni analítica. Ver [pasos de monetización](MONETIZATION.md) antes de habilitarlos. El código y la configuración Android se versionan; APK, claves, archivos locales del SDK y assets copiados se excluyen de Git. Las APK firmadas se adjuntan a Releases.
