# F10 — Historial de mis predicciones con desglose de puntos
> **Estado:** ✅ Aprobada v1.0 (2026-11-05, D94) · **Prioridad:** Must · **Módulo:** M3 · **Depende de:** F05, F06, F03 · **Pantallas:** S02 (puntos por partido), S03 (desglose) · **Decisiones:** D34, D35, D44, D52, D76, D78

## Objetivo
Que el usuario vea, partido por partido, cuántos puntos ganó y por qué: base (qué partes acertó), bono de la IA con su explicación y afirmaciones. Alcance reducido: el historial vive en las jornadas pasadas de S02 (D34) y el desglose en S03; **sin pantalla propia ni estadísticas personales** (B14). Todo número viene del servidor (D52).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Sin pantalla nueva:** el historial son las jornadas de S02 (con su selector) y el detalle es S03 terminado (D34). | D34 |
| R2 | **El servidor da todo:** vista `mis_puntos` (`security_invoker`; filtra a las predicciones de `auth.uid()` además de las RLS, para que no cambie cuando M4 abra R04) con, por predicción: `partidoId`, partes de la calificación, `puntosBase`, `estadoPrediccion` (`ACERTADA` = todo lo predicho acertó, `PARCIAL` = alguna parte, `FALLADA` = ninguna, `ANULADA` = partido cancelado, `SIN_CALIFICAR`), `estadoBono` (`SIN_JUSTIFICACION` / `PENDIENTE` / `EVALUADA` / `ERROR`), `puntosBono`, `explicacion`, `afirmaciones` y `puntosTotal` (base + bono). La app no suma ni deduce nada. | D52 |
| R3 | **S02, tarjeta de un partido con predicción propia** (en el espacio que dejó F02; el indicador "Predicho" de F03 se queda en partidos sin terminar): `TERMINADO` y calificado → `IndicadorEstado` según `estadoPrediccion` (acertada / parcial / fallada) + "+310" en `numero`; con bono pendiente, "· bono pendiente" en `pendiente`. `TERMINADO` sin calificar → "Calificando…" (`meta`). `CANCELADO` → "Anulado" (`meta`). Sin predicción → nada. | 05-ui §2, §5, U3, U5 |
| R4 | **S03 terminado, sección "Tus puntos"** (debajo de mi predicción en solo lectura): total en `marcadorXL`; filas `TablaFila` solo de lo que predije: "Resultado", "Goles en total" o "Marcador exacto", cada una con `IndicadorEstado` y sus puntos; con marcador fallado, nota "Marcador fallado: sumaste las partes que acertaste." | D27, U3 |
| R5 | **S03, sección "Bono por tu análisis"** según `estadoBono`: `EVALUADA` → "+60 / 100", la explicación (`cuerpo`) y la lista de afirmaciones con `IndicadorEstado` (acertada, cercana = parcial, fallada, no verificable) y su motivo en `meta` (cubre las "estadísticas usadas" de 02-navigation S03); `PENDIENTE` → "Bono pendiente: la IA está revisando tu análisis."; `ERROR` → "Bono no disponible para este partido."; `SIN_JUSTIFICACION` → la sección no se muestra. | D08, P5 |
| R6 | **Anulado:** S03 de un partido cancelado con predicción muestra "Partido cancelado: tu predicción se anuló y no cuenta." | D44 |
| R7 | `IndicadorEstado` agrega la variante **no verificable** (`textoTenue`, ícono "–") a 05-ui §5; los textos y colores de los demás estados ya existen. | 05-ui §5 |
| R8 | **Visibilidad en M3:** solo mis puntos y mis evaluaciones (RLS de F05 R10 y F06 R15). Los de otros llegan con los grupos en M4 (R04). | D35 |
| R9 | **Permisos (nivel 3, se aprueba con esta spec):** `mis_puntos` se concede a `authenticated` (lee con sus RLS, sin `security definer`); `anon` sin acceso. | D14 |

## Flujo
**Servidor:** migración con la vista `mis_puntos` (R2) y su permiso (R9).

**App**
1. S02 pide `mis_puntos` de los partidos de la jornada junto con las predicciones propias (misma consulta de F03 o una en paralelo) y pinta R3.
2. S03 pide `mis_puntos` del partido; si está `TERMINADO` o `CANCELADO`, pinta R4–R6 debajo del encabezado con el marcador.
3. Recargar (deslizar en S02, volver a abrir S03) trae los puntos nuevos; no hay actualización en vivo.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Puntos sin conexión con datos previos | Los de F02/F03 (franja "Sin conexión · datos de [hora]"); los puntos mostrados son los últimos cargados. |
| Error al cargar solo los puntos | La tarjeta o S03 se muestran sin la parte de puntos y con "No se pudieron cargar tus puntos." + "Reintentar" en S03. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `mis_puntos` devuelve para cada caso el estado correcto: acertada, parcial (incluido marcador fallado con partes), fallada, anulada, sin calificar; bono sin justificación, pendiente, evaluado y error; `puntosTotal` = base + bono (solo base si no hay bono evaluado). | [prueba] pgTAP |
| CA2 | Un usuario solo ve sus filas en `mis_puntos`; `anon` no tiene acceso. | [prueba] pgTAP |
| CA3 | La tarjeta de S02 muestra cada estado de R3 (calificado con y sin bono pendiente, calificando, anulado, sin predicción). | [prueba] jest |
| CA4 | S03 terminado muestra el desglose de R4 y cada estado del bono de R5 (con afirmaciones), y el anulado de R6. | [prueba] jest |
| CA5 | Tras terminar un simulado, S02 de su jornada muestra los puntos y S03 el desglose con bono y afirmaciones; se ve completo en un emulador de 320–360 dp. | [teléfono] |

## Fuera de alcance
Pantalla propia de historial, totales por jornada o torneo en S09, estadísticas personales (B14), puntos de otros (M4), tabla completa de estadísticas del partido, actualización en vivo.
