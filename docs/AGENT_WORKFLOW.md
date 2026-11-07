# Agentes y control desde el móvil

## Funcionamiento

Orca es el panel de sesiones. Codex, iniciado con la cuenta ChatGPT, ejecuta el trabajo en el PC. GitHub conserva las ramas y propuestas de cambios. El PC debe permanecer encendido, conectado y con Orca abierto para acceder desde Android.

Los perfiles de `.codex/agents/` definen modelo e instrucciones para futuras sesiones locales de Codex. No son procesos permanentes ni aparecen automáticamente en la pestaña Agents de GitHub. La configuración del proyecto se carga en copias confiables; una sesión ya iniciada puede necesitar empezar otra sesión para leerla.

## Rutina

1. Describir una tarea y cómo comprobar que está terminada.
2. Crear o elegir una copia de trabajo independiente en Orca basada en develop. No reutilizar la copia que está utilizando otra persona.
3. Ejecutar con un agente. Usar el perfil auxiliar en tareas acotadas y desarrollador en funciones de varios módulos.
4. Ejecutar comprobaciones. Pedir una revisión independiente cuando cambie el comportamiento o haya riesgo de regresión.
5. Preparar una propuesta de cambios en GitHub y revisar sus resultados desde el móvil.
6. Tras dos intentos sin avance, guardar el diagnóstico y esperar una decisión. Al alcanzar cuota o saldo, conservar el trabajo y pausar las tareas afectadas.

## Android

Instalar la aplicación desde https://www.onorca.dev/download/android. En Orca de escritorio, abrir la vinculación desde el menú de cuenta o estado y completar personalmente el intercambio de código con el teléfono. Para acceso fuera de casa, usar una ruta remota admitida, como Orca Relay cuando esté disponible. Una conexión limitada a la red local no basta desde datos móviles. Comprobar desde el teléfono con Wi-Fi desactivado que se puede leer una sesión y enviar una instrucción inocua.

## Dos presupuestos

La cuota de ChatGPT Pro y los créditos de API son distintos. Los créditos promocionales no cubren Codex con API key. La API puede usarse en un gestor propio para tareas compatibles; el gestor debe llevar su cola y guardar progreso antes de cualquier cambio de vía. El cambio no lo hace automáticamente la facturación de OpenAI ni se ha verificado como función automática de Orca.

El gestor inicial se prepara fuera del juego, en CentroOperaciones. Sus pruebas con proveedores simulados no equivalen a una conexión API activa. No guardar credenciales en el repositorio. Una estimación local de coste no garantiza el saldo real del proveedor.

## Fuentes

- https://learn.chatgpt.com/docs/agent-configuration/subagents
- https://www.onorca.dev/docs/agents/codex
- https://www.onorca.dev/docs/mobile
- https://developers.openai.com/api/docs/guides/chatgpt-api-credits
