# F02 — Partidos de la Liga MX: sincronización y lista por jornada

> **Estado:** ✅ Aprobada v1.0 (2026-10-04, D56–D57)
> **Prioridad:** Must · **Semana:** S2 · **Depende de:** F01 (para ver la lista) · **Pantallas:** S02
> **Decisiones:** D03, D04, D14, D24, D29, D43, D46, D50, D52, D54

Esta feature tiene dos partes: **(A) sincronización en el servidor** (actor: sistema) y **(B) lista de partidos en la app** (actor: usuario).

---

## Parte A — Sincronización (servidor)

### A1. Objetivo
Mantener en la base de datos los equipos, jornadas y partidos del torneo activo con horario, estado y marcador de 90 minutos actualizados, sin superar el límite de consultas de la API, y descargar estadísticas y eventos de cada partido que termina.

### A2. Actor
Sistema (tareas programadas). Administrador para la carga inicial.

### A3. Precondiciones
- Torneo activo configurado (`Torneo.esActual`). En desarrollo: **Apertura 2024** (temporada 2024, D24). Desde S5: Apertura 2026.
- Clave de API-Football guardada como secreto del servidor.

### A4. Procesos
| Proceso | Cuándo | Qué hace | Consultas aprox. |
|---|---|---|---|
| **P1. Carga inicial** | Manual (administrador), una vez por torneo | Crea/actualiza liga, torneo, equipos, jornadas y todos los partidos del torneo. | 2–3 |
| **P2. Actualización diaria** | 1 vez al día (Q1) | Vuelve a traer los partidos del torneo para detectar cambios de horario, pospuestos y cancelados. | 1 |
| **P3. Detección de finales** | Cada 15 min, **solo** si hay partidos que ya debieron terminar (inicio + 115 min) y no están `TERMINADO` | Consulta el estado de esos partidos (hasta 20 por consulta). | 0–10 por día de partidos |
| **P4. Datos del partido terminado** | Cuando P3 detecta un partido `TERMINADO` | Descarga estadísticas y eventos y los guarda. Marca el partido como listo para calificar (F05). | 2 por partido |

Estimado de un día con jornada completa (9 partidos): ~30 consultas (límite: 100).

### A5. Reglas
| ID | Regla |
|---|---|
| R1 | La sincronización es **idempotente**: se identifica todo por `proveedorId`; repetirla no duplica nada. |
| R2 | El marcador guardado es el de **90 minutos** (`score.fulltime` de la API), nunca el que incluye tiempo extra o penales (D43). |
| R3 | Las fechas se piden y guardan en **UTC**. |
| R4 | **Tope de consultas:** antes de cada consulta se revisa el total del día (registros de `Sincronizacion`); al llegar a **90** se detiene todo excepto P3/P4 de partidos ya terminados, y se registra la alerta. |
| R5 | Toda respuesta de la API se valida con un esquema (Zod) antes de guardar; si no cumple, no se guarda nada de esa respuesta y se registra el error (D54). |
| R6 | Si la respuesta trae `errors` no vacío (p. ej. plan sin acceso a la temporada), se trata como falla. |
| R7 | Una falla **nunca** borra ni altera datos ya guardados. |
| R8 | Cada ejecución deja un registro en `Sincronizacion` (tipo, inicio, fin, estado, consultas usadas, error). |
| R9 | Si un partido cambia de horario **antes** de su inicio original, se actualiza `inicio` (nuevo cierre de predicciones). Si cambia **después**, se actualiza `inicio` pero las predicciones siguen bloqueadas (D46). |

### A6. Conversión de estados de la API
| Estado en API-Football | Estado en la app |
|---|---|
| `TBD`, `NS` | `PROGRAMADO` |
| `1H`, `HT`, `2H`, `ET`, `BT`, `P`, `LIVE`, `SUSP`, `INT` | `EN_JUEGO` |
| `FT`, `AET`, `PEN` | `TERMINADO` |
| `PST` | `POSPUESTO` |
| `CANC`, `ABD` | `CANCELADO` |
| `AWD`, `WO` | Ver Q2 |
| Cualquier otro | Se registra como error y el partido no cambia de estado |

### A7. Conversión de jornadas
Nombres reales de rondas en API-Football (verificado con la temporada 2024):

| Nombre en la API | En la app |
|---|---|
| `Apertura - 1` … `Apertura - 17` (igual con `Clausura`) | Jornada 1 … 17, fase `REGULAR` |
| `Reclasificación` / `Reclasificacion` y `Play-offs` | Una jornada **"Liguilla · Play-in"**, fase `LIGUILLA` (solo existe en datos 2024; el play-in se eliminó para 2026) |
| `Quarter-finals` | Jornada **"Liguilla · Cuartos"** (ida y vuelta), fase `LIGUILLA` |
| `Semi-finals` | Jornada **"Liguilla · Semifinales"** (ida y vuelta), fase `LIGUILLA` |
| `Final` | Jornada **"Liguilla · Final"** (ida y vuelta), fase `LIGUILLA` |

Las jornadas se ordenan por `orden`: 1–17 para la fase regular y 18 en adelante para las rondas de liguilla, en orden cronológico.

- La API **no es consistente con los acentos** ("Reclasificación" en Apertura, "Reclasificacion" en Clausura): se comparan los nombres normalizados (sin acentos, minúsculas).
- Un nombre de ronda que no esté en la tabla se registra como error y el partido no se guarda.

### A8. Casos de error
| Caso | Comportamiento |
|---|---|
| API caída, tiempo agotado o error 5xx | Se registra; se reintenta en la siguiente ejecución programada. |
| Límite de consultas agotado (429 o R4) | Se detiene; se registra; continúa al día siguiente. |
| Respuesta con forma inesperada | No se guarda (R5); se registra. |
| Equipo desconocido en un partido | Se crea el equipo a partir de los datos del partido. |
| Estadística sin valor | Se guarda como "sin dato", no como 0 (D29). |

---

## Parte B — Lista de partidos (app, S02)

### B1. Objetivo
Que el usuario vea los partidos de una jornada con su hora y estado para decidir qué predecir.

### B2. Actor
Usuario con sesión iniciada.

### B3. Datos de entrada
`jornada?` (parámetro de ruta). Si no viene, la **jornada actual** (Q4).

### B4. Flujo principal
1. El usuario abre la pestaña Partidos.
2. Se muestra la jornada actual: nombre (p. ej. "Jornada 10") y controles para ir a la anterior y a la siguiente.
3. Los partidos se listan **agrupados por día** y ordenados por hora de inicio, en la **hora del teléfono**.
4. Cada partido muestra: escudo y nombre corto de ambos equipos, hora, estado (`Por jugar` / `En juego` / `Terminado` / `Pospuesto` / `Cancelado`) y, si terminó, el marcador de 90 minutos (Q5).
5. Tocar un partido abre S03 (`/partido/:partidoId`).
6. Deslizar hacia abajo recarga la lista.

> El indicador "ya predije" (F03) y los puntos por partido (F10) **se agregan en esas features**; F02 deja el espacio en la tarjeta.

### B5. Reglas
| ID | Regla |
|---|---|
| B-R1 | La app **nunca** llama a API-Football; solo lee de Supabase (D14). |
| B-R2 | Los datos de fútbol son de solo lectura para los usuarios (políticas RLS). |
| B-R3 | Durante `EN_JUEGO` no se muestra marcador en vivo (D04); solo el estado. |
| B-R4 | Los escudos se cargan desde URL con caché (`expo-image`), no van dentro de la app (D52). |

### B6. Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueletos de tarjetas. |
| Con datos | La lista. |
| Jornada sin partidos | "No hay partidos en esta jornada." |
| Error / sin conexión **sin** datos previos | Mensaje + botón reintentar. |
| Error / sin conexión **con** datos previos | Se muestran los datos guardados + aviso "Sin conexión; datos no actualizados". |

---

## Criterios de aceptación
| ID | Criterio | Cómo se prueba |
|---|---|---|
| CA1 | La carga inicial del Apertura 2024 crea 18 equipos, 17 jornadas de fase regular con **153** partidos, más las rondas finales. | Automatizada contra la BD |
| CA2 | Ejecutar la carga inicial dos veces no duplica equipos, jornadas ni partidos. | Automatizada |
| CA3 | La conversión de estados cumple la tabla A6 para cada estado listado. | Prueba unitaria |
| CA4 | El marcador guardado de un partido con tiempo extra es el de 90 minutos. | Prueba unitaria con respuesta de ejemplo |
| CA5 | Con 90 consultas registradas en el día, P1/P2 no hacen más consultas y queda registrada la alerta. | Prueba unitaria |
| CA6 | Ante una respuesta con `errors` o con forma inválida, ningún dato existente cambia y queda un registro con estado de error. | Prueba unitaria |
| CA7 | Al detectarse un partido `TERMINADO`, quedan guardados sus estadísticas y eventos; los valores vacíos quedan como "sin dato". | Automatizada con datos de 2024 |
| CA8 | Un cambio de horario en la API se refleja tras la siguiente actualización diaria. | Prueba unitaria |
| CA9 | S02 muestra los partidos de la jornada agrupados por día, ordenados por hora y en hora local. | Manual |
| CA10 | Navegar a la jornada anterior/siguiente muestra sus partidos; en los extremos el control correspondiente se deshabilita. | Manual |
| CA11 | Los estados de B6 se ven correctamente (modo avión con y sin datos previos). | Manual |
| CA12 | Un usuario autenticado no puede crear, modificar ni borrar partidos, equipos o jornadas. | Prueba automatizada contra RLS |
| CA13 | La app no contiene la clave de API-Football. | Revisión |
| CA14 | Compila con TypeScript estricto sin errores ni `any`. | Verificación de tipos |

## Fuera de alcance
Marcador en vivo, tabla general y previa (F21), indicador de predicción (F03), puntos por partido (F10), partidos simulados (F09).

## Decisiones de esta spec (D56)
| ID | Decisión |
|---|---|
| Q1 | Actualización diaria a las 06:00 hora de Tijuana. |
| Q2 | `AWD`/`WO` → `TERMINADO` con el marcador que reporte la API. |
| Q3 | Rondas verificadas (A7). Las rondas finales se muestran como **"Liguilla"**; el play-in ya no existe en 2026. |
| Q4 | Jornada actual = la del próximo partido por jugar; si el torneo terminó, la última. |
| Q5 | Los partidos terminados muestran su marcador de 90 minutos. |
| Q6 | La liguilla se divide en **una jornada por ronda** (cuartos, semifinales, final), cada una con su ranking de jornada (D57). |
