# Preparación para Android e iOS

Capacitor 8 está instalado y configurado con `com.flechatrampa.game`, `FLECHA TRAMPA` y `dist`. El código selecciona Preferences en nativo, pausa y guarda al pasar a segundo plano, integra Haptics y atiende el botón atrás de Android. CSS usa `viewport-fit=cover` y `env(safe-area-inset-*)`.

## Requisitos pendientes en este ordenador

Se encontró Windows, Java 19.0.2 y Node global 20.10.0. Se instaló Node 24.22.2 portátil dentro del proyecto. No se encontraron Android Studio, Android SDK ni `adb` en las ubicaciones habituales o PATH. No se ha compilado ningún APK/AAB/IPA ni se ha probado un plugin en hardware real.

Capacitor 8 requiere Android Studio 2025.2.1 o posterior y Android SDK; usar el JDK incluido con Android Studio. Para iOS se necesita macOS, Xcode 26 o posterior y Command Line Tools. Consultar los [requisitos oficiales de Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup) antes de preparar la máquina de compilación.

## Android

Instalar Android Studio y un SDK compatible; configurar un dispositivo o emulador. Después, en la raíz del proyecto y usando Node 24:

```sh
npm ci
npm run build
npx cap add android
npm run cap:sync
npm run cap:android
```

`cap add` se ejecuta una vez: revisar una carpeta nativa existente antes de reutilizarla. En Android Studio, comprobar el JDK de Gradle, sincronizar y ejecutar en vertical. Revisar orientación, bordes del sistema, retorno de segundo plano, vibración, sonido, guardados y enlaces. Generar AAB firmado para distribución solo después de pruebas reales. Las claves de firma y `local.properties` están ignorados por Git.

## iOS

En un Mac con las herramientas necesarias:

```sh
npm ci
npm run build
npx cap add ios
npm run cap:sync
npm run cap:ios
```

Configurar equipo de firma, identificador definitivo, orientación vertical, iconos y lanzamiento en Xcode. Añadir el manifiesto de privacidad a la app y verificar su pertenencia al target. [Preferences requiere declarar UserDefaults; Capacitor recomienda el motivo CA92.1](https://capacitorjs.com/docs/apis/preferences). Se incluye una plantilla en `templates/PrivacyInfo.xcprivacy`; integrarla con cualquier manifiesto existente, sin reemplazar otras declaraciones.

## Enlaces públicos y tiendas

Configurar `VITE_PUBLIC_URL` antes del build nativo: la dirección interna `https://localhost` no permite que otra persona abra un reto. El MVP incluye URLs web reproducibles. Los Universal Links/App Links que abren la app instalada requieren dominio propio y configuración adicional nativa.

Preparar iconos y pantallas de lanzamiento finales, política de privacidad, clasificación por edades, formularios de datos y fichas de tienda según el producto real. Actualmente no hay SDK publicitario, compras ni analítica. Ver [pasos de monetización](MONETIZATION.md) antes de habilitarlos. No se han creado proyectos nativos generados ni se han versionado compilaciones.
