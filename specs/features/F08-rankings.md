# F08 — Rankings del grupo: torneo y jornada
> **Estado:** ✅ **Terminada** (2026-11-07, D100: cumple CA1–CA11 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-07, D97) · **Prioridad:** Must · **Módulo:** M4 · **Depende de:** F05, F06, F07 · **Pantallas:** S08 (ranking), S04 (mi posición) · **Decisiones:** D10, D40, D44, D45, D47, D52, D57, D78, D86, D97

## Decisiones (D97)
4. **Desempates:** a igual total, **más marcadores exactos**, luego **más puntos de bono**. Si sigue el empate, comparten posición (1, 1, 3) y se ordenan por nombre.

## Objetivo
Mostrar en cada grupo quién va arriba en el **torneo actual** y en **cada jornada**. El servidor calcula todo en una sola consulta por ranking (D52); la app solo lo pinta.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Qué suma:** por predicción, `Calificacion.puntosBase` + `puntosBono` **solo si** la evaluación está `EVALUADA` (pendiente o `ERROR` suman 0 de bono, igual que `mis_puntos`). Sin calificación no suma: un partido cancelado no cuenta (D44). Un resultado corregido después no se recalcula (D47). | R09, D10, F10 R2 |
| R2 | **Quién:** los **miembros actuales** del grupo (D45). Cuentan **todos** sus partidos del torneo desde la jornada 1, aunque se hayan unido después (D10). Quien sale desaparece; si vuelve, recupera todo. Un miembro sin puntos aparece con 0. | R09, D10, D45 |
| R3 | **Torneo:** el **torneo actual** (`Torneo.esActual`). **Jornada:** una jornada de ese torneo (incluye las de liguilla, D57). Los rankings de torneos anteriores no se muestran en el MVP. | R09 |
| R4 | **Simulados:** sus puntos **cuentan** (D40); los simulados entran en el torneo y la jornada actuales (F09 R3). Cada ranking devuelve `incluye_simulados` y, si es verdadero, S08 muestra la nota `meta` "Incluye partidos simulados" (R08). | D40, R08 |
| R5 | **Orden y desempates:** según la decisión 4. La posición la calcula el servidor. | — |
| R6 | **Una función, una consulta:** `ranking_grupo(grupo_id, jornada_id default null)` devuelve, por miembro: `posicion`, `usuario_id`, `nombre`, `foto_url`, `puntos_total`, `puntos_base`, `puntos_bono`, `marcadores_exactos`, `es_yo`, más `incluye_simulados` y la fecha de la última calificación que contó. Con `jornada_id` vacío es el ranking del torneo. Si no soy miembro, falla con `NO_MIEMBRO`; una jornada de otro torneo falla con `JORNADA_INVALIDA`. | D52 |
| R7 | **Actualización:** se calcula en cada lectura, sin tablas precalculadas: refleja una calificación (F05, cada minuto) o un bono (F06) en cuanto existen. La app vuelve a pedirlo al abrir S08, al cambiar de vista o jornada y al deslizar para recargar; no hay actualización en vivo. | F05, F06 |
| R8 | **S04:** `mis_grupos` (de F07) agrega `mi_posicion` en el ranking del torneo de cada grupo, calculada con la misma función interna que R6, para no pedir un ranking por grupo. | 02-navigation S04 |
| R9 | **S08:** `PestanasTexto` "Torneo" / "Jornada" (`vista`). En "Jornada", selector de jornada como el de S02 (anterior / siguiente), con la jornada actual por defecto (`jornada_actual`, D86). Cambiar de vista o de jornada usa `router.setParams` (D78); la ruta agrega `jornada?` (el `orden`, como en S02). Filas `TablaFila`: posición (`numero`), foto, nombre, puntos totales; mi fila resaltada. Debajo de las filas, en `meta`: "Base + bono de la IA. Desempate: marcadores exactos y bono." Las secciones "Invitar" y "Salir" de F07 siguen debajo. | 02-navigation S08, 05-ui §5 |
| R10 | **Rendimiento:** la función usa los índices que ya existen (`prediccion (usuario_id, partido_id)`, `calificacion (prediccion_id)`) y agrega uno sobre `partido (torneo_id, jornada_id)` si el plan de consulta lo pide. La app nunca trae predicciones ni calificaciones de otros para sumar. | D52 |
| R11 | **Permisos (nivel 3, se aprueban con esta spec):** `ranking_grupo` es `security definer` con `search_path` vacío (suma calificaciones y evaluaciones ajenas sin abrir esas tablas) y comprueba que `auth.uid()` sea miembro del grupo; solo devuelve las columnas de R6 (de otros, solo nombre, foto y puntos). `execute` para `authenticated`, no para `anon`. `mis_grupos` sigue con `security_invoker` y usa una función interna `security definer` de solo lectura para `mi_posicion`. | D14, D35 |

## Flujo
**Servidor:** migración con `ranking_grupo`, la función interna de posición, el cambio de `mis_grupos` (R8), el índice de R10 si hace falta y sus permisos (R11).

**App**
1. S08 llama a `ranking_grupo` con la vista y la jornada de la ruta y pinta R9; los miembros de F07 se reemplazan por el ranking del torneo.
2. S04 muestra "Vas 2.º de 5" con `mi_posicion` y el número de miembros.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Sin puntos aún (nadie suma en el torneo o la jornada) | Los miembros con 0 y la posición compartida, más "Aún no hay partidos calificados en esta jornada." (o "en este torneo"). |
| Jornada sin partidos | "Esta jornada no tiene partidos." con el selector activo. |
| Sin torneo actual | "No hay un torneo en curso." |
| No soy miembro (`NO_MIEMBRO`) | El de F07: "No perteneces a este grupo." + "Ir a Grupos". |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | El ranking del torneo suma base + bono evaluado de los miembros solo en partidos del torneo actual; no cuentan los de otro torneo, un partido cancelado ni el bono pendiente o con `ERROR`. | [prueba] pgTAP |
| CA2 | El ranking de una jornada suma solo los partidos de esa jornada; una jornada de otro torneo falla con `JORNADA_INVALIDA`. | [prueba] pgTAP |
| CA3 | Alguien que se une en la jornada 5 aparece con sus puntos desde la jornada 1; alguien que sale desaparece y, si vuelve, recupera sus puntos; un miembro sin predicciones aparece con 0. | [prueba] pgTAP |
| CA4 | Desempates de la decisión 4: con el mismo total gana quien tiene más marcadores exactos, después más bono; un empate completo comparte posición (1, 1, 3). | [prueba] pgTAP |
| CA5 | Los puntos de un simulado cuentan y `incluye_simulados` es verdadero solo si alguno contó. | [prueba] pgTAP |
| CA6 | Un no miembro recibe `NO_MIEMBRO`; `anon` no puede ejecutar la función; la respuesta no trae columnas de más (correo, predicciones). | [prueba] pgTAP |
| CA7 | Después de `registrar_calificaciones` (y de guardar una evaluación), la siguiente llamada ya trae los puntos nuevos. | [prueba] pgTAP |
| CA8 | `mis_grupos.mi_posicion` coincide con la posición de `ranking_grupo` para el mismo usuario. | [prueba] pgTAP |
| CA9 | S08 hace una sola llamada por ranking; cambiar de vista o de jornada usa `setParams` (sin historial); mi fila sale resaltada; la nota de simulados solo aparece con `incluye_simulados`; los estados de arriba se pintan. | [prueba] jest |
| CA10 | Con 3 cuentas en un grupo, tres predicciones distintas de un simulado: al terminarlo, en ≤ 5 min (calificación y bono) el ranking del torneo y el de la jornada muestran las posiciones esperadas en las 3 cuentas, y S04 muestra la posición de cada una. | [teléfono] |
| CA11 | S08 con el ranking se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Rankings de torneos anteriores, ranking global (entre todos los usuarios), "Mejor análisis de la jornada" e insignias de top (F14), compartir el ranking (F15), perfil al tocar un miembro (F19), actualización en vivo, excluir simulados (se hará con la marca cuando haya usuarios reales, D40).
