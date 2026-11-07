# Trabajo de agentes en Flecha Trampa

## Objetivo y alcance

Desarrollar el juego móvil de puzles preservando partidas, controles táctiles y reproducibilidad de niveles. Leer README.md y docs/GIT_WORKFLOW.md al empezar. Confirmar el estado actual del código: la documentación puede describir una versión anterior.

Trabajar en la copia asignada. No editar otra copia del juego ni cambiar su rama. Respetar los cambios de otros agentes. Cada encargo debe tener un resultado observable y un alcance concreto.

## Reparto y consumo

- Resolver cambios pequeños con un solo agente. Para cambios complejos se permite delegar en un ejecutor y un revisor con tareas delimitadas.
- Usar `auxiliar` para exploración, documentación y cambios acotados; `desarrollador` para funcionalidades; `revisor` para comprobar cambios importantes. Sus perfiles están en .codex/agents/.
- El coordinador define objetivo, archivos y criterio de aceptación antes de delegar. Los trabajadores no crean más agentes.
- Devolver un resumen breve con archivos, comprobaciones y bloqueos. Leer los archivos necesarios y el contexto relevante; evitar volcar registros completos.
- Tras dos intentos sin progreso, guardar el diagnóstico y pedir una decisión. No repetir una petición rechazada por saldo agotado o cuota sin un cambio de estado.
- La configuración de rondas es una norma de trabajo, no un límite de facturación. Comprobar consumo en el proveedor.

## Implementación y comprobaciones

- Mantener TypeScript estricto, Phaser, Vite y Capacitor existentes. Usar Node 24 y el lockfile. No instalar dependencias nuevas para cambios de documentación.
- Preservar las garantías de progreso guardado, semillas y generador independiente. Revisar docs/ARCHITECTURE.md y docs/VALIDATION.md cuando afecten a la tarea.
- Ejecutar las comprobaciones proporcionadas por package.json que cubran el cambio. Para cambios de código, la referencia de integración es `npm run check`, `npm run format:check` y pruebas de navegador afectadas.
- Para cambios solo de instrucciones o documentación, comprobar formato, enlaces locales y validez TOML; no reinstalar todo el juego.
- Los tests de navegador y emulador no prueban compatibilidad con teléfonos físicos. Informar qué se verificó realmente.

## Entrega

- Crear ramas de trabajo desde develop y preparar una propuesta de cambios con propósito y validación. No desarrollar directamente sobre main.
- No reescribir historial, hacer force push, publicar versiones ni fusionar a main como parte de una tarea ordinaria. Esas acciones requieren un encargo específico.
- Mantener claves de firma y credenciales fuera de archivos, commits, prompts y registros. Los créditos API promocionales no cubren Codex autenticado con API key.
- Leer docs/AGENT_WORKFLOW.md para el control desde Orca y el móvil.
