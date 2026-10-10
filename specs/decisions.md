# Registro de decisiones

> Regla: una decisión **cerrada** no se vuelve a discutir salvo que aparezca información nueva; si cambia, se agrega una nueva fila que la reemplaza (no se borra la anterior).
> Última actualización: 2026-10-03

## Decisiones cerradas

| ID | Fecha | Decisión | Razón |
|---|---|---|---|
| D01 | 2026-10-03 | El proyecto **no** pretende tratar la ludopatía; es una alternativa sin dinero para validar conocimiento futbolístico. | Promesa no demostrable para una app escolar. |
| D02 | 2026-10-03 | Usuario principal: aficionado mexicano de 18–25 años, sigue Liga MX y **ya apuesta** en apps. Secundario: mismo perfil que no apuesta pero está tentado. | Definido por Jesús; si hay que elegir, el que ya apuesta. |
| D03 | 2026-10-03 | Solo Liga MX (Apertura 2026). Se evaluó Premier League y se descartó. | Premier con datos gratis no trae estadísticas y rompe la coherencia con el usuario principal. |
| D04 | 2026-10-03 | No se requieren datos en tiempo real; basta el resultado final y estadísticas poco después de terminar el partido. | El tiempo real es caro y no lo exige ninguna funcionalidad. |
| D05 | 2026-10-03 | Puntos por **tabla fija según dificultad de la predicción** (opción A). Sin momios. | Momios = mecánica de apuestas (P2). |
| D06 | 2026-10-03 | Sin multiplicadores por combinar predicciones; las predicciones combinadas solo suman. | Las combinadas multiplicadas son una mecánica de apuestas (P2). |
| D07 | 2026-10-03 | Fallar una predicción da 0 puntos; nunca se restan puntos. | Fomentar participar (P3). |
| D08 | 2026-10-03 | La justificación es **opcional y solo otorga un bono**; nunca penaliza. Se evalúa contra lo que pasó en el partido: un análisis cercano recibe bono aunque la predicción falle. | Fomentar justificar; "estuvo cerca" debe valer algo. |
| D09 | 2026-10-03 | Predicción de goleadores **fuera** del MVP. | Requiere plantillas y es difícil de validar. |
| D10 | 2026-10-03 | Ranking del torneo (desde la jornada 1, igual para todos, aunque el usuario entre después) + ranking por jornada dentro de cada grupo. Insignias por quedar en el top de una jornada. | Que quien entra tarde tenga motivación cada jornada. |
| D11 | 2026-10-03 | Registro e inicio de sesión con Google. | Más sencillo para el usuario. |
| D12 | 2026-10-03 | Plataforma objetivo: **Android**. iOS fuera. | No hay iPhone ni Mac para probar. |
| D13 | 2026-10-03 | Tecnología base: React Native con Expo + backend propio. Herramientas concretas se eligen en la fase de Diseño. | Preferencia de Jesús; el backend es necesario (calificar sin que nadie abra la app, proteger claves, ocultar justificaciones). |
| D14 | 2026-10-03 | Las claves de servicios externos (IA, datos de fútbol) **solo viven en el backend**, nunca en la app. | Todo lo que va en la app se puede extraer. |
| D15 | 2026-10-03 | Se incluye un **modo de partidos simulados** para desarrollo y demo. | La demo puede no coincidir con un partido terminado. |
| D16 | 2026-10-03 | Funcionalidades nativas complejas pueden quedar fuera si no son esenciales para el objetivo. | El docente no las exige; prioridad al objetivo del sistema. |
| D17 | 2026-10-03 | Un solo repositorio con `App/`, `backend/` y `specs/`. | Se eliminó el repo anidado en `backend/`. |
| D18 | 2026-10-03 | Puntos: resultado (local/empate/visitante) **100**, total de goles **150**, marcador exacto **300**; bono de justificación **0–100**. | Proporción según dificultad; escala grande para que acertar "se sienta". |
| D19 | 2026-10-03 | El marcador exacto **no suma doble** con el resultado y el total de goles que se deducen de él, ni cuando acierta ni cuando falla. Si el usuario da marcador, no captura resultado ni total por separado. Acertar marcador exacto = 350 en total (valor en D26). | Evitar puntos duplicados por la misma predicción. Marcador fallado: ver D27. |
| D20 | 2026-10-03 | **Una predicción por usuario y partido**; cuenta para todos los grupos del usuario. Cada grupo es un ranking de sus miembros. | No capturar lo mismo varias veces; no duplicar datos. |
| D21 | 2026-10-03 | La predicción se puede crear o editar **hasta antes de la hora de inicio del partido** (según la hora del servidor). | Nadie puede predecir con el partido ya empezado. |
| D22 | 2026-10-03 | Reconocimiento de voz **fuera** del MVP. | Complejo; el teclado de Android ya permite dictar. |
| D23 | 2026-10-03 | Carta de jugador personalizable y títulos equipables **fuera** del MVP. | Las insignias en el perfil cubren la recompensa visible. |
| D24 | 2026-10-03 | Datos: API-Football. Desarrollo y pruebas de reglas de negocio con **temporada 2024 (plan gratis)**; se paga **1 mes** del plan Pro para la temporada 2026, con fecha elegida según el día de la demo. | El plan gratis solo da temporadas 2022–2024; los límites de consultas no son problema (~25 por jornada). |
| D25 | 2026-10-03 | La demo debe incluir una **prueba en vivo con partidos reales** de la Liga MX 2026 (además del modo simulado). | Demostrar que la app funciona con datos reales. |
| D26 | 2026-10-03 | **Reemplaza el valor de marcador de D18:** marcador exacto = **350**. Resultado 100, total de goles 150 y bono 0–100 se mantienen. | Con la opción (a) de P-02b, un marcador fallado puede dar 250; acertarlo debe valer claramente más. |
| D27 | 2026-10-03 | Si el marcador exacto falla, se califican por separado el resultado y el total de goles deducidos de él y **se suman las partes acertadas** (máx. 250). Ej.: predijo 2-1, terminó 3-0 → 100 + 150 = 250. | Elección de Jesús (opción a de P-02b). |
| D28 | 2026-10-03 | `00-project.md` **aprobado** (v1.0). | Aprobación de Jesús. |
| D29 | 2026-10-03 | El plan gratis de API-Football **sí incluye** partidos, estadísticas y eventos de la Liga MX temporada 2024 (verificado con el partido 1206057, Puebla 2-1 Querétaro). Se desarrolla con esos datos. | Prueba de Jesús. Nota: algunos campos llegan vacíos (`Red Cards`, `expected_goals`, `goals_prevented`) y deben tratarse como "sin dato". |
| D30 | 2026-10-03 | Chat en tiempo real **fuera**. Candidatos para el MVP: botón "Compartir" (hoja nativa de Android) y comentarios simples en justificaciones reveladas. | El usuario ya tiene WhatsApp; el debate se da sobre las justificaciones. |
| D31 | 2026-10-03 | No se hará encuesta propia; la evidencia de `00-project.md` v1.1 es suficiente. | La calificación del proyecto se enfoca en el desarrollo de la app. |
| D32 | 2026-10-03 | Prioridades del MVP aprobadas; **F11 Notificaciones sube a Must**, F12 QR queda Should. | Decisión de Jesús; funcionalidad nativa relevante para la materia. |
| D33 | 2026-10-03 | Plan semanal de `01-mvp.md` §4 aprobado. | Aprobación de Jesús. |
| D34 | 2026-10-03 | El historial de predicciones (F10) vive en las jornadas pasadas de la pantalla Partidos; no tiene pantalla propia. | Ahorra una pantalla. |
| D35 | 2026-10-03 | Las predicciones **y** justificaciones de un usuario son visibles para quienes comparten al menos un grupo con él **solo a partir de la hora de inicio del partido** (cuando se cierran las predicciones). Esta regla la aplica el **backend**, no solo la pantalla. | Evitar que se copien predicciones; ocultarlo solo en la interfaz no lo impide. |
| D36 | 2026-10-03 | La simulación de partidos (F09) solo está disponible para cuentas administrador; su propósito es validar la app en la presentación. | Decisión de Jesús. |
| D37 | 2026-10-03 | El QR del grupo se lee solo con el escáner dentro de la app. | Sin configuración de enlaces profundos. |
| D38 | 2026-10-03 | Tocar a un miembro en el ranking abre su perfil en solo lectura (F19). | Da valor al perfil y a las insignias. |
| D39 | 2026-10-03 | Se agregan al MVP como **Should**: F17 Inicio (3 bloques fijos, pantalla inicial), F18 Equipo favorito, F19 Perfil de otro usuario. F19 en S6; F17 y F18 en S7. Si F17 se recorta, la pantalla inicial es Partidos. | Aprobado por Jesús (P-15). |
| D40 | 2026-10-03 | En la presentación, los partidos simulados **sí cuentan** en el ranking, usando un **grupo y cuentas exclusivas para la demo**. Los datos de partidos y puntos simulados quedan **marcados como simulados** para poder excluirlos cuando haya usuarios reales. | Mostrar el ranking funcionando en la demo (P-16); la marca evita rehacer datos al publicar. |
| D41 | 2026-10-03 | F20 "Carta ligera" estilo FIFA como **Could**; el modelo de datos guarda desde el inicio las estadísticas por usuario que la alimentarían. | Aprobado por Jesús (P-17). |
| D42 | 2026-10-04 | Ajustes al MVP: "Mejor análisis de la jornada" es una insignia dentro de F14; nueva **F21 Previa del partido (Should)** dentro del detalle de partido; F20 pasa a "Carta con atributos" (Could, primera en entrar si sobra tiempo); la "Vitrina" es la sección de insignias del perfil (trofeos de torneo al backlog B07); prioridad de Should: F13 → F14 → F21 → F12 → F19 → F17 → F18 → F15. | Aprobado por Jesús (P-18). |
| D43 | 2026-10-04 | Las predicciones se califican con el resultado de los **90 minutos** (tiempo regular + agregado); tiempo extra y penales no cuentan. | Simplicidad; "pasa de ronda" queda en backlog (B16). |
| D44 | 2026-10-04 | Partido **cancelado**: sus predicciones se anulan; no dan puntos ni rompen rachas. | Aprobado (DM-04). |
| D45 | 2026-10-04 | Si un usuario sale de un grupo, desaparece del ranking de ese grupo (el ranking considera solo a los miembros actuales). | Aprobado (DM-06). |
| D46 | 2026-10-04 | Partido pospuesto: si el cambio ocurre **antes** de la hora de inicio original, la nueva hora es el nuevo cierre; si ocurre **después** (predicciones ya bloqueadas y visibles), no se reabren y se califican cuando se juegue; si nunca se juega, aplica D44. | Reabrir después de revelar permitiría copiar (D35). |
| D47 | 2026-10-04 | Si un resultado cambia después de calificado, **no se recalcula** en el MVP; limitación documentada. | Caso raro; recalcular afecta rankings, rachas e insignias. |
| D48 | 2026-10-04 | El total de goles se predice con **4 rangos**: "0–1", "2", "3", "4 o más" (150 puntos si acierta). Reemplaza "total de goles exacto" en D18/D27. Con marcador exacto, el rango se deduce. | Distribución Liga MX 2024 (90 min): 24% / 21% / 27% / 27%; ninguna opción es obvia y no hay momios (P2). |
| D49 | 2026-10-04 | `03-data-model.md` **aprobado** (v1.0). | Aprobación de Jesús. |
| D50 | 2026-10-04 | Backend y base de datos: **Supabase** (PostgreSQL, Auth con Google, Edge Functions en TypeScript, tareas programadas con `pg_cron`). `backend/` se reemplaza por la estructura de Supabase. | Única opción que cumple datos relacionales, tareas programadas y presupuesto (04-tech-stack §2). |
| D51 | 2026-10-04 | Herramientas de la app aprobadas: Expo Router, TanStack Query, estado de React/Context, Google Sign-In nativo + `signInWithIdToken`, `expo-notifications` + push de Expo, `expo-camera` + `react-native-qrcode-svg`, `Share`, development build. IA: Claude Haiku 4.5 (Sonnet 4.6 de respaldo; se confirma en F06). | Aprobación de Jesús (04-tech-stack §3–4). |
| D52 | 2026-10-04 | Requisitos no funcionales del docente: **app ligera** y **app delgada** — la lógica de negocio (puntos, reglas, catálogo de insignias, textos configurables) vive en el servidor; la app solo muestra lo que el servidor responde. Cambios de JavaScript se publican con **actualizaciones por aire (EAS Update)** sin pasar por revisión de la tienda. Objetivo de tamaño se fija al medir el primer build (S2). | Indicación del docente. |
| D53 | 2026-10-04 | iOS: la entrega es solo Android, pero **todo el código es multiplataforma** (sin APIs exclusivas de Android). Publicar en iOS después requiere cuenta de Apple Developer, "Iniciar sesión con Apple" y pruebas. | Aprobado (P-19); ~28% del mercado mexicano es iOS. |
| D54 | 2026-10-04 | **TypeScript con tipado estricto** en app y servidor: `strict` + `noUncheckedIndexedAccess`; prohibido `any` (regla de lint como error); tipos de la base de datos **generados** desde el esquema de Supabase; **validación en tiempo de ejecución con Zod** en todas las fronteras (respuestas de API-Football, salida de la IA, entradas de las funciones del servidor); rutas tipadas de Expo Router; estados modelados como uniones discriminadas. | Pedido de Jesús. Los tipos no protegen contra datos externos mal formados; Zod sí. |
| D55 | 2026-10-04 | Spec **F01 aprobada** con las propuestas de sus preguntas Q1–Q4. | Aprobación de Jesús. |
| D56 | 2026-10-04 | F02: propuestas Q1, Q2, Q4, Q5 aprobadas; las rondas finales se muestran como **"Liguilla"** (sin play-in, eliminado para 2026); la fase de `Jornada` pasa a `REGULAR` / `LIGUILLA`. Pendiente F02-Q6. | Aprobación de Jesús; rondas verificadas con la API. |
| D57 | 2026-10-04 | La liguilla se divide en **una jornada por ronda** ("Liguilla · Cuartos", "Liguilla · Semifinales", "Liguilla · Final"), cada una con ranking de jornada e insignia "top de la jornada". Spec **F02 aprobada**. | Mantiene el ritmo semanal; la demo cae en liguilla. |
| D58 | 2026-10-10 | Los commits los ejecuta **Jesús**. Claude entrega al final de cada bloque de trabajo los comandos listos (archivos exactos + mensaje), sin ejecutarlos. | Jesús quiere monitorear el avance. |
| D59 | 2026-10-10 | **Un commit por tarea** terminada. El mínimo de 3 por semana es orientativo (fomentar trabajo constante), no un conteo estricto. | Respuesta de Jesús. |
| D60 | 2026-10-10 | `02-navigation.md` **aprobado** (v1.0, 13 pantallas). | Aprobación de Jesús. |
| D61 | 2026-10-10 | La app tendrá **modo claro y modo oscuro**, con una identidad visual propia (no una interfaz genérica). Dirección visual: pendiente (P-21). | Pedido de Jesús. |
| D62 | 2026-10-10 | **Reemplaza D61:** la app tiene **solo tema oscuro**. Dirección visual: mezcla de "Pizarrón del DT" (base, análisis) y "Ultimate Team" (solo para recompensas). Base oscura **distinta del azul marino** que usan las apps de estadísticas. Los colores se definen como variables (tokens) para poder agregar un tema claro en el futuro sin reescribir. | Análisis de Jesús: las apps deportivas y de gamificación usan fondos oscuros para resaltar lo llamativo; además, un solo tema reduce el trabajo de diseño y pruebas a la mitad. |
| D63 | 2026-10-10 | Nombre de la app: **"Campeón de Sillón"**. | Decisión de Jesús; "sillón" es más local que "sofá" y evita confusión con SofaScore. |
| D64 | 2026-10-10 | Identificador de paquete Android: **`mx.campeondesillon.app`** (permanente). | Decisión de Jesús; sin nombre personal. |
| D65 | 2026-10-10 | Paleta principal: **Grafito y naranja balón** (fondo #131211, acento #FF6A2B). La arquitectura de temas queda lista (colores como variables, proveedor de tema) para agregar más paletas en el futuro; el selector **no** entra al MVP (backlog B20). | Decisión de Jesús, por tiempo. |
| D66 | 2026-10-10 | Trabajo por **módulos M1–M6** (ver `01-mvp.md` §4.1): specs del módulo → tareas → implementación → pruebas → validación de Jesús; las specs del siguiente módulo se escriben mientras se valida el actual. | Aprobado por Jesús (P-23), con ajuste pendiente sobre funcionalidades nativas (P-25). |
| D67 | 2026-10-10 | Dirección de diseño: **mezcla de "Sección deportiva" y "Transmisión"**. De Sección deportiva: estructura con líneas finas, tablas, formas rectas (radio pequeño, sin cortes en diagonal), menú inferior de texto con barra de acento y **Archivo para todo el texto**. De Transmisión: **Teko para titulares y números** y los colores de los equipos en el encabezado del partido. Del Pizarrón: "Cierra en" separado del encabezado y la **forma de los equipos como círculos de color** con la letra (G/E/P). | Decisión de Jesús tras revisar las 3 direcciones y la mezcla. |
| D68 | 2026-10-10 | Encabezado del partido: **variante 2** — nombres completos en Teko con una franja delgada del color de cada equipo; "Cierra en" debajo, separado. | Elección de Jesús (P-21). |
| D69 | 2026-10-10 | F11 se divide: **F11a** (permiso de notificaciones, registro del dispositivo y recordatorio antes del partido) en **M2**; **F11b** (aviso de puntos listos) en **M3**. Ambas Must. | Funcionalidad nativa visible desde la semana 3 (P-25). |
| D70 | 2026-10-10 | `Equipo` agrega `colorPrimario` y `colorTexto` (cargados manualmente: la API no los proporciona); si faltan, se usa un color neutro. | Necesario para el encabezado de partido (D68). |
| D71 | 2026-10-11 | `05-ui.md` **aprobado** (v1.0). | Aprobación de Jesús. |
| D72 | 2026-10-11 | El selector de marcador llega hasta **10 goles por equipo**. | Decisión de Jesús (UI-02). |

## Pendientes

| ID | Pregunta | Propuesta de Claude |
|---|---|---|
| P-07 | Fecha exacta de la demo (finales de noviembre). | Preguntarle al docente; define cuándo pagar la API. |
| P-20 | Tamaño máximo de descarga de la app. | Medir el primer development build en S2 y fijar un tope con margen (referencia: ≤ 30 MB). |
