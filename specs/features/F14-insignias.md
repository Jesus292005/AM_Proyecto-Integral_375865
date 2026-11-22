# F14 — Insignias y Vitrina
> **Estado:** ✅ Aprobada v1.2 (2026-11-22, detalle de la insignia en hoja, pedido de Jesús en el guion de M6) · v1.1 (2026-11-21, D109: límites de R3) · v1.0 (2026-11-21, D108) · pendiente de implementar · **Prioridad:** Must del rediseño (antes Should, D42, D104) · **Módulo:** M6 Identidad · **Depende de:** F05, F06, F07, F08, F13, F28 · **Pantallas:** S09 (Vitrina) · **Decisiones:** D10, D40, D42, D47, D52, D57, D101, P4, 05-ui §5 y §8

## Decisiones (D108)
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 4 | ¿Los partidos simulados otorgan insignias? | **Sí, marcadas** "Simulada" (como la racha, D101). | No. | A permite ganar las personales en pruebas y en la demo con simulados (las de jornada esperan a que se cierre la jornada actual, porque los simulados entran en ella, F09). Con B solo llegan con partidos reales, una jornada por semana. |
| 5 | ¿Dónde se gana "Top de la jornada"? | **Solo en grupos con al menos 3 miembros** que predijeron esa jornada. | En cualquier grupo. | Con B, un grupo de una persona regala la insignia cada jornada y pierde valor. |

## Objetivo
Recompensas visibles por acertar y analizar bien (P4): la Vitrina del perfil muestra las insignias ganadas con su metal y las que faltan, con lo que hay que hacer para ganarlas.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Catálogo** (en el servidor, D52): **Primer acierto** (`PRIMER_ACIERTO`, bronce): primera predicción con puntos base > 0 · **Visionario** (`MARCADOR_EXACTO`, plata): primer marcador exacto acertado · **Analista** (`ANALISTA`, bronce): primer bono de IA ≥ 70 · **En racha** (`RACHA_5`, plata): mejor racha ≥ 5 (F13) · **Imparable** (`RACHA_10`, oro): mejor racha ≥ 10 · **Top de la jornada** (`TOP_JORNADA`, oro, repetible): 1.º del ranking de jornada de un grupo (F08) · **Mejor análisis de la jornada** (`MEJOR_ANALISIS`, plata, repetible): el mayor bono de IA de la jornada entre los miembros de un grupo, con 50 o más. | D10, D42, 03-data-model |
| R2 | Cada insignia tiene `codigo`, `nombre`, `descripcion` (cómo se gana), `nivel` (`BRONCE` \| `PLATA` \| `ORO`), `icono` (nombre de `Icono`: `check`, `diana`, `bombilla`, `llama`, `trofeo`) y `repetible`. La app pinta lo que llega; un ícono que no conoce se dibuja como `trofeo`. | D52 |
| R3 | **Cuándo:** `otorgar_insignias()` corre cada 15 min con `pg_cron`. Las personales, con las calificaciones y evaluaciones que ya existan. Las de jornada (`TOP_JORNADA`, `MEJOR_ANALISIS`), solo cuando la jornada está cerrada (F05 R7) y ninguna evaluación de sus predicciones sigue `PENDIENTE`; usan el ranking de jornada de F08 (base + bono, miembros actuales, R09). Empates: todos la ganan. `TOP_JORNADA` exige al menos 3 miembros con predicción en esa jornada (decisión 5) y más de 0 puntos. Solo cuentan las jornadas que terminaron (`fechaFin`) después de crearse el grupo y en los últimos 30 días (D109). | D10, D57, R09, D109 |
| R4 | **Una sola vez:** las no repetibles, una por usuario; las repetibles, una por usuario, grupo y jornada. Correr la función de nuevo no duplica nada. No se quitan aunque cambie un resultado (D47) o el usuario salga del grupo. | D47 |
| R5 | **Simulados:** decisión 4; la obtenida guarda `esSimulada` y la Vitrina lo indica. | R08, D40 |
| R6 | **Vitrina** (S09, F28 R2): rejilla con **todo el catálogo**, con el componente `Insignia` (05-ui §5): la ganada con su metal, nombre y "×n" si es repetible y la ganaste varias veces; la no ganada, `bloqueada` ("?" en `superficie2`). Tocar una abre su **detalle en una hoja** (modal sobre la Vitrina, v1.2): medalla grande, nombre, nivel (y si se repite), si la tienes ("La ganaste n veces" / "Aún no la tienes"), "Cómo se gana" y, si la tienes, cuándo la ganaste la última vez, en qué grupo y jornada (las de jornada) y si fue con un simulado. Se cierra con "Cerrar", tocando fuera o con "atrás". | 05-ui §5 |
| R7 | **Nueva:** `InsigniaObtenida.vistaEn` vacío = no vista. Al abrir S09, las no vistas hacen la animación celebratoria de 05-ui §8 una sola vez (escala de 0.8 a 1 con brillo, 400 ms, sin rebote) y la app llama a `marcar_insignias_vistas()`. | 05-ui §8 |
| R8 | **Servidor:** tablas `insignia` (catálogo de R1) e `insignia_obtenida`; vista `mis_insignias` (`security_invoker`: el catálogo con veces, última fecha, grupo, jornada, `es_simulada` y si hay alguna sin ver); función `marcar_insignias_vistas()`. | D52 |
| R9 | **Permisos (nivel 3, se aprueban con esta spec):** `select` de `insignia` y de `mis_insignias` a `authenticated`; de `insignia_obtenida`, `select` y `update (vista_en)` solo de las propias (RLS); nadie de la API inserta ni borra. `otorgar_insignias()` sin `execute` para la API (solo la tarea programada). `anon` sin acceso. | D14, D35 |

## Flujo
**Servidor:** migraciones con las tablas, la vista y los permisos (R8–R9), y la función con su tarea programada (R3).

**App:** S09 pide `mis_insignias` (Zod), pinta la Vitrina (R6) y anima las nuevas (R7). Se vuelve a pedir al volver a la pestaña.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Sin insignias | Todo el catálogo bloqueado y "Tu primera insignia llega con tu primer acierto." |
| Cargando | Esqueleto de la rejilla (círculos). |
| Error | Mensaje y "Reintentar" dentro de la sección. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Cada insignia personal se otorga una sola vez, al cumplirse su condición; correr la función dos veces no duplica nada. | [prueba] pgTAP |
| CA2 | `TOP_JORNADA` y `MEJOR_ANALISIS` se otorgan por grupo y jornada solo con la jornada cerrada y sin evaluaciones pendientes; empates para todos; `TOP_JORNADA` no en grupos con menos de 3 participantes; `MEJOR_ANALISIS` no con un bono menor a 50. | [prueba] pgTAP |
| CA3 | Las de simulados salen marcadas; cada usuario ve solo las suyas; nadie las otorga, borra ni cambia salvo `vista_en` de las propias; `anon` nada. | [prueba] pgTAP |
| CA4 | La Vitrina muestra ganadas, bloqueadas y "×n"; tocar una abre su detalle (R6) y se cierra; solo las no vistas se animan y después se marcan vistas. | [prueba] jest |
| CA5 | Con simulados en un grupo de 3, ganar "Primer acierto" y verla animarse una sola vez en S09; cuando se cierre la jornada actual (sus partidos reales terminados y calificados), "Top de la jornada" llega a quien quedó 1.º. | [teléfono] |
| CA6 | La Vitrina se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Trofeos de torneo (B07), insignias de otros usuarios (F19, M8), aviso de insignia nueva en la campana (F27, M9) o por notificación, compartir una insignia (F15).
