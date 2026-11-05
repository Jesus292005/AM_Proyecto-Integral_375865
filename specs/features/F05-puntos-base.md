# F05 — Calificación automática de puntos base
> **Estado:** ✅ Aprobada v1.0 (2026-11-05, D94) · **Prioridad:** Must · **Módulo:** M3 · **Depende de:** F02 (`listoParaCalificarEn`, marcador de 90 min), F03 (predicciones), F09 (simulados para probar) · **Pantallas:** ninguna propia (los puntos se ven con F10 en S02 y S03) · **Decisiones:** D05, D06, D07, D18, D19, D26, D27, D40, D43, D44, D46, D47, D48, D52, D54, D84, D85

## Objetivo
Cuando un partido (real o simulado) termina y tiene sus datos, el servidor califica **una sola vez** cada predicción con la tabla fija de R05, sin que nadie abra la app. Es el "motor de puntos" en TypeScript (04-tech-stack T8): una función pura con una prueba por cada combinación.

## Tabla de R05 (completa)
Valores de `valor_puntos` (R2): resultado **100**, rango de goles **150**, marcador exacto **350**. Del marcador real de 90 min se deducen el resultado (`LOCAL` / `EMPATE` / `VISITANTE`) y el rango del total de goles (`0–1` → `G0_1`, `2` → `G2`, `3` → `G3`, `4+` → `G4_MAS`, D48).

**Forma (a): resultado y/o rango** (se califica cada parte que el usuario eligió; las no elegidas valen 0)

| # | Predijo | Resultado | Rango | `puntosResultado` | `puntosRangoGoles` | `puntosMarcador` | `puntosBase` |
|---|---|---|---|---|---|---|---|
| a1 | Solo resultado | ✓ | — | 100 | 0 | 0 | **100** |
| a2 | Solo resultado | ✗ | — | 0 | 0 | 0 | **0** |
| a3 | Solo rango | — | ✓ | 0 | 150 | 0 | **150** |
| a4 | Solo rango | — | ✗ | 0 | 0 | 0 | **0** |
| a5 | Resultado + rango | ✓ | ✓ | 100 | 150 | 0 | **250** |
| a6 | Resultado + rango | ✓ | ✗ | 100 | 0 | 0 | **100** |
| a7 | Resultado + rango | ✗ | ✓ | 0 | 150 | 0 | **150** |
| a8 | Resultado + rango | ✗ | ✗ | 0 | 0 | 0 | **0** |

**Forma (b): marcador exacto** (resultado y rango se deducen del marcador predicho; nunca suman doble, D19)

| # | Caso | Ejemplo (predijo → terminó) | `puntosResultado` | `puntosRangoGoles` | `puntosMarcador` | `puntosBase` |
|---|---|---|---|---|---|---|
| b1 | Marcador exacto | 2-1 → 2-1 | 0 | 0 | 350 | **350** |
| b2 | Fallado, resultado y rango deducidos ✓ (D27) | 2-1 → 3-0 | 100 | 150 | 0 | **250** |
| b3 | Fallado, solo resultado ✓ | 2-1 → 1-0 | 100 | 0 | 0 | **100** |
| b4 | Fallado, solo rango ✓ | 2-1 → 1-2 | 0 | 150 | 0 | **150** |
| b5 | Fallado, nada ✓ | 2-1 → 0-0 | 0 | 0 | 0 | **0** |
| b6 | Fallado, empate ✓ y rango ✗ | 1-1 → 0-0 | 100 | 0 | 0 | **100** |
| b7 | Fallado, empate ✓ y rango ✓ | 2-2 → 3-3 | 100 | 150 | 0 | **250** |
| b8 | Fallado, rango `G4_MAS` ✓ | 3-2 → 4-1 | 100 | 150 | 0 | **250** |
| b9 | Fallado, rango `G0_1` ✓ con resultado ✗ | 1-0 → 0-1 | 0 | 150 | 0 | **150** |

> El máximo de un marcador fallado es 250 = resultado + rango (D27); el exacto vale 350 (D26). Fallar = 0, nunca negativo (D07). b7–b9 cubren los extremos de los rangos (`G4_MAS`, `G0_1`) y el empate.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Selección:** partidos `TERMINADO` con `listoParaCalificarEn` lleno, `calificadoEn` vacío y marcador de 90 min completo; reales y simulados. Máximo 10 partidos por ejecución. Un partido terminado sin marcador no se selecciona (dato inconsistente; queda sin calificar y se ve como "Calificando…" en F10). | D84, R06 |
| R2 | Los valores de puntos viven en la tabla `valor_puntos` (una fila: resultado, rango, marcador); la función los lee en cada ejecución y se los pasa a la función pura. Cambiarlos no requiere actualizar la app. | D52, F03 R9 |
| R3 | **Marcador de 90 minutos:** se usa `golesLocal`/`golesVisitante`, que F02 ya guarda sin tiempo extra ni penales (F02 R2). Un partido de liguilla 1-1 que se definió en penales se califica como empate 1-1. | D43 |
| R4 | **Una sola vez (R06), aunque la tarea corra dos veces o en paralelo:** la función calcula y llama a `registrar_calificaciones(partido, calificaciones)`, que en **una transacción** bloquea la fila del partido (`for update`); si `calificadoEn` ya está lleno responde `YA_CALIFICADO` sin cambiar nada; si no, inserta una `Calificacion` por predicción (única por `prediccionId`), exige que estén **todas** las predicciones del partido (si falta alguna, `CALIFICACION_INCOMPLETA` y no guarda nada) y llena `calificadoEn`. Un partido sin predicciones también queda calificado. | R06 |
| R5 | `Calificacion.esSimulada` = `Partido.esSimulado` (R08). Los simulados se califican igual que los reales y cuentan en el ranking de la demo. | D40 |
| R6 | **Cancelado** (`CANCELADO`, incluye `ABD`): nunca llega a `TERMINADO`, así que sus predicciones no se califican; quedan **anuladas** (sin puntos, no rompen rachas, D44); F10 las muestra como "Anulado". **Pospuesto:** no se califica mientras esté `POSPUESTO`; si se juega, entra por R1 como cualquier terminado (D46); si nunca se juega, la API lo pasa a cancelado y aplica D44. `AWD`/`WO` llegan como `TERMINADO` con el marcador de la API (F02 Q2) y se califican con él. Si un resultado cambia después de calificado, no se recalcula (D47). | D44, D46, D47 |
| R7 | **Jornada cerrada:** en la misma transacción de R4, si todos los partidos de la jornada están calificados o cancelados, `Jornada.estaCerrada = true` (F09 R3 la reabre al crear un simulado). | 03-data-model |
| R8 | **Tarea programada cada minuto** con `pg_cron` + `pg_net` y los secretos de Vault (D83); solo llama a la función si `partidos_por_calificar` devuelve algo (patrón de D85, sin registros vacíos). Así los puntos llegan ≤ 2 min después de que el partido queda listo. | D83, D85 |
| R9 | Cada ejecución escribe en el registro de la función cuántos partidos y predicciones calificó y los errores (como `recordatorios`); responde 502 si hubo algún error. | F11a |
| R10 | **Permisos (nivel 3, se aprueban con esta spec):** `calificacion` y `valor_puntos` con RLS. `authenticated` lee **solo** las calificaciones de sus predicciones (M4 abre las de su grupo, R04) y lee `valor_puntos`; no escribe nada. `anon` sin acceso. `partidos_por_calificar` y `registrar_calificaciones` son `security invoker` y las ejecuta **solo** `service_role`; sin `security definer`. | D14, D35 |

## Flujo
**Servidor**
1. Migración: `valor_puntos`, `calificacion` (03-data-model: `prediccionId` único, partes, `puntosBase`, `esSimulada`, `calificadaEn`), `partidos_por_calificar(limite)`, `registrar_calificaciones` (R4, R7), RLS y permisos (R10).
2. `_shared/calificacion/puntos.ts`: `calificarPrediccion(prediccion, marcador90, valores)` → partes y `puntosBase` (tabla de R05). Pura, sin acceso a la BD.
3. Función `calificar`: lee pendientes (R1) y `valor_puntos`; por partido lee sus predicciones, calcula y llama a `registrar_calificaciones`; `YA_CALIFICADO` cuenta como éxito sin cambios.
4. Migración aparte: tarea cada minuto (R8).

**App:** nada en esta feature (F10 muestra los puntos).

## Estados de pantalla
No aplica.

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `calificarPrediccion` cumple cada fila de la tabla de R05 (a1–a8, b1–b9): partes y total. | [prueba] deno |
| CA2 | Un partido de liguilla con respuesta de la API 1-1 a los 90 min y penales se guarda (F02) y se califica como empate 1-1: un marcador 1-1 predicho recibe 350. | [prueba] deno |
| CA3 | Llamar `registrar_calificaciones` dos veces, o dos ejecuciones de `calificar` en paralelo sobre la BD local, deja **una** calificación por predicción; la segunda responde `YA_CALIFICADO`. Si falta una predicción, no se guarda nada (`CALIFICACION_INCOMPLETA`). | [prueba] pgTAP + deno contra la BD |
| CA4 | `partidos_por_calificar` devuelve solo `TERMINADO` + listo + sin calificar + con marcador; excluye sin `listoParaCalificarEn`, `EN_JUEGO`, `POSPUESTO`, `CANCELADO` y ya calificados. | [prueba] pgTAP |
| CA5 | La calificación de una predicción de un simulado queda con `esSimulada = true`; la de un real, `false`. | [prueba] pgTAP |
| CA6 | La jornada queda cerrada cuando todos sus partidos están calificados o cancelados, y no antes. | [prueba] pgTAP |
| CA7 | Un usuario solo lee sus calificaciones; nadie con `authenticated` o `anon` inserta, cambia o borra calificaciones ni `valor_puntos`, ni ejecuta las dos funciones. | [prueba] pgTAP |
| CA8 | Las predicciones de un partido cancelado nunca reciben calificación. | [prueba] pgTAP |
| CA9 | El administrador termina un simulado predicho por otra cuenta: sin intervención, en ≤ 2 min esa cuenta ve sus puntos base en S03 (con F10). | [teléfono] |

## Fuera de alcance
Bono de IA (F06), mostrar puntos (F10), aviso (F11b), recalcular por cambio de resultado (D47), "pasa de ronda" (B16), rachas (F13), rankings (F08).
