# Campeón de Sillón — instrucciones para Claude

App móvil (React Native + Expo SDK 57, Android) de predicciones de la Liga MX con gamificación y sin dinero real. Proyecto escolar de una sola persona (Jesús); entrega a finales de noviembre de 2026.

**El tiempo de Jesús es el recurso más escaso.** Avanza con autonomía dentro de estas reglas, reserva las preguntas para lo que de verdad las necesita y reporta en el formato corto de abajo. La calidad no se negocia: se demuestra con pruebas, no con explicaciones.

## Al empezar una sesión
1. Lee el archivo de tareas de la semana en curso (`specs/tasks/`) y la spec de la feature (`specs/features/`).
2. Busca en `specs/decisions.md` las decisiones que cita esa spec y las reglas de `specs/03-data-model.md` §3 que toca. No hace falta releer todo cada vez.
3. Para una API de Expo que el repo **todavía no usa**, consulta la documentación de SDK 57 (`App/AGENTS.md`). Para lo que ya se usa, sigue el código existente.

## Niveles de decisión
Clasifica cada decisión antes de tomarla.

| Nivel | Qué es | Qué haces |
|---|---|---|
| **1. Implementación** | Nombres, estructura de archivos y componentes, cómo se escribe una consulta, organización de pruebas, refactors internos, mensajes que siguen un patrón ya usado; todo lo que repite un patrón que ya existe en el repo. | Decide y sigue. **No lo menciones.** |
| **2. Supuesto** | La spec no lo dice, pero hay una lectura razonable, coherente con P1–P5, las decisiones y el código existente; se revierte en menos de 30 min y no cambia otra feature. Ej.: un token visual que falta, un estado de pantalla no descrito, un índice, un límite técnico, un texto de interfaz. | Decide, sigue y anótalo en **una línea** en "Supuestos" (archivo de tareas y reporte). |
| **3. Bloqueante** | La lista de abajo. | **Detén esa tarea**, sigue con las del lote que no dependan de ella y pregunta en el reporte. |

**Siempre son nivel 3:**
- Cambiar una regla de negocio (puntos, cierre, visibilidad, rankings, rachas, insignias) o contradecir una decisión aprobada o un criterio de aceptación.
- Cambiar el modelo de datos de forma que afecte a otra feature, o borrar o renombrar columnas con datos.
- Agregar una dependencia **nativa** (obliga a una development build nueva y suma tamaño, D79) o cualquier dependencia que no esté en `specs/04-tech-stack.md`.
- Abrir permisos: RLS, `GRANT`, funciones `security definer`, exponer datos de otro usuario o algo a `anon`.
- Gastar dinero o cuota (API-Football, Anthropic, EAS) más allá de lo que prevé la spec.
- Acciones sobre el proyecto **remoto** o irreversibles: `db push`, secretos, despliegue de funciones, borrar datos, tareas programadas reales. Claude las prepara; Jesús las ejecuta.
- Recortar alcance o marcar una feature como terminada.

En duda entre 2 y 3: si equivocarte cuesta más de 30 minutos rehacerlo o lo notaría el usuario final, es 3.

Si una instrucción de Jesús te parece una mala decisión, dilo en **una línea** con la alternativa y haz lo que él decida.

## Trabajo por lotes
Jesús pide un lote (`/lote L2` o "haz T31–T35"). Para cada tarea, en orden:
1. Implementa y escribe las pruebas.
2. Corre las verificaciones que aplican (abajo). Si fallan, corrige. Si tras 2 intentos sigue fallando por algo que no entiendes, márcala ⏸ y sigue con la siguiente.
3. Marca la tarea ✅ en el archivo de tareas y escribe sus supuestos en la columna "Supuestos".

Al terminar el lote: corre el subagente `revisor` sobre el diff, corrige lo que encuentre de nivel 1–2 y entrega el reporte.

- No esperes aprobación entre tareas del mismo lote.
- No hagas tareas fuera del lote. Si descubres que falta una, anótala en "Necesito de ti".
- Trabaja contra la **base local** (`npx supabase db reset --local`). Las migraciones se suben al remoto una vez por lote, y lo hace Jesús.

## Verificaciones
- App: `cd App && npm run typecheck && npm run lint && npm test`
- Servidor: `cd supabase/functions && deno task typecheck && deno task lint && deno task test`
- Si tocaste SQL: `npx supabase db reset --local`, `npm run test:db` y `cd supabase/functions && deno task test:bd`
- Al cerrar un módulo: `npm run revisar:secretos`

Nunca digas que algo pasa sin haberlo corrido en esta sesión. Copia los números reales.

## Trazabilidad (así verifica Jesús sin leer todo)
- Toda prueba que cubre un criterio empieza con su id: `it('F03 CA2: no deja editar después del cierre', …)`; en pgTAP, la descripción empieza con `F03 CA2:`.
- Un criterio que solo se valida en el teléfono va al "Guion de prueba" del reporte, nunca se da por cumplido sin Jesús.

## Reporte del lote (formato obligatorio, máximo ~25 líneas)

    ## Lote L2 (T33–T36)
    ✅ T33 · ✅ T34 · ⏸ T35 (motivo en una línea) · ✅ T36
    Verificación: app 140/140 · servidor 90/90 · bd 25/25 · pgTAP 120/120 · lint y tipos sin errores
    Criterios: F03 CA1–CA6 con prueba · CA7 al guion
    Revisor: sin hallazgos | 2 corregidos
    Supuestos (nivel 2):
    1. … (`ruta/archivo.ts`)
    Necesito de ti:
    1. [Pregunta de nivel 3] — A (recomendada): … / B: … Consecuencia: una línea.
    2. [Acción 👤] `comando exacto`
    Guion de prueba en el teléfono (si aplica): 3–6 pasos con el resultado esperado.
    Commits: (bloque de comandos)

- Sin introducciones ni despedidas, sin recorrer archivo por archivo lo que hiciste, sin explicar decisiones de nivel 1.
- Durante el trabajo no narres. Un mensaje intermedio solo si un bloqueante detiene **todo** el lote.
- Si Jesús pregunta "¿por qué?", ahí sí explica, en breve.

## Specs y decisiones
- No se programa sin spec aprobada. Las specs de un módulo se escriben juntas con `/specs-modulo`, en la plantilla corta, y llevan arriba **"Decisiones para Jesús"** (máximo 5, cada una con opción recomendada). Todo lo demás sigue los patrones de F01 y F02.
- `decisions.md` solo recibe decisiones de **nivel 3** aprobadas por Jesús: una fila, sin historia. Los supuestos de nivel 2 viven en el archivo de tareas. **Ya no se crean archivos `*-propuestas.md`.**
- Si al implementar la spec resulta incompleta en algo de nivel 2, corrígela en el mismo lote y anótalo como supuesto.
- Una feature solo se marca terminada cuando cumple sus criterios **y** Jesús la aprobó en su teléfono (01-mvp §3).

## Commits
- **Jesús ejecuta los commits** (D58). Al final del lote, entrega un solo bloque con los comandos: un commit por tarea (D59), `git add` de archivos concretos, formato `tipo(área): descripción` en español (`feat`, `fix`, `docs`, `test`, `chore`, `refactor`).
- Nunca subir secretos. No leas los archivos `.env`.

## Reglas técnicas
- TypeScript estricto, sin `any`; Zod en todas las fronteras de datos externos (D54).
- Toda la lógica de negocio (puntos, reglas, visibilidad, insignias) vive en el servidor (Supabase); la app solo muestra (D52).
- Las claves secretas (API-Football, Anthropic, servicio de Supabase) **nunca** van en la app (D14).
- UI: solo tokens de `specs/05-ui.md`; nada de colores, tamaños o espacios sueltos. Toda pantalla con datos maneja cargando / vacío / error / sin conexión.
- Navegación con `router.navigate` o `<Link>`, nunca `router.push` (D78).
- Código multiplataforma: sin APIs exclusivas de Android (D53).
