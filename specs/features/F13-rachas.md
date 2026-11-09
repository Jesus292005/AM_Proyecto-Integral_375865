# F13 — Rachas de aciertos
> **Estado:** ✅ **Terminada** (2026-11-09, D102: cumple CA1–CA8 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-07, D101) · **Prioridad:** Should (entra solo si sobra tiempo en S7, D88, D98) · **Módulo:** M4 · **Depende de:** F05 · **Pantallas:** S09 (sección "Racha") · **Decisiones:** D40, D44, D47, D52, D98, D101, P4

## Decisiones (D101)
1. **Acierto:** predicción calificada con **puntos base > 0** (acertó al menos una parte, incluido el marcador fallado con partes acertadas, D27). 0 puntos base rompe la racha.
2. **Sin predecir:** un partido que no predije **no** rompe la racha; solo cuentan mis predicciones calificadas, una tras otra (P4).
3. **Alcance: histórica**, de todas las temporadas y torneos (no se reinicia con cada torneo). Las calificaciones de prueba de 2024 cuentan; la demo usa cuentas nuevas (T76).
4. **Simulados:** cuentan, marcados con "Incluye partidos simulados" (R08, D40).

## Objetivo
Mostrar en el perfil cuántas predicciones seguidas con puntos llevo (**racha actual**) y la más larga que he tenido (**mejor racha**), en todas las temporadas. Premia acertar, nunca abrir la app (P4). El servidor la calcula a partir de `Calificacion` (D52); la app solo la muestra.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Orden:** todas mis predicciones **calificadas**, de cualquier torneo (decisión 3), ordenadas por `Partido.inicio` (y `Partido.id` en empate). No importa el orden en que se calificaron. | 03-data-model §4 |
| R2 | **Acierto y fallo:** según la decisión 1. Un fallo (0 puntos base) deja la racha actual en 0. Un partido cancelado no tiene calificación: ni suma ni rompe (D44). Un resultado corregido después no se recalcula (D47). | D44, D47 |
| R3 | **Sin predecir:** según la decisión 2. | P4 |
| R4 | **Racha actual** = aciertos seguidos desde el último fallo hasta la predicción calificada más reciente. **Mejor racha** = la secuencia de aciertos seguidos más larga. | 03-data-model §4 |
| R5 | **Simulados:** decisión 4. La vista devuelve `incluye_simulados` si alguna calificación simulada cuenta para la racha actual o la mejor. | R08, D40 |
| R6 | **Servidor:** vista `mi_racha` (`security_invoker`, filtrada por `auth.uid()`) con `racha_actual`, `mejor_racha`, `incluye_simulados` y `ultima_calificacion`. Siempre devuelve una fila (0 y 0 sin calificaciones). Se calcula en cada lectura, sin tablas precalculadas. | D52 |
| R7 | **S09, sección "Racha"** (la pantalla sigue provisional; la sección es real): "Racha actual" y "Mejor racha" en `numero` con "aciertos seguidos" en `meta`. Debajo, en `meta`: "Cuenta tus predicciones con puntos, una tras otra. Un partido sin predecir no la rompe." y "Incluye partidos simulados" si aplica. Sin ninguna calificación: "Tu racha empieza con tu primer acierto." Se vuelve a pedir cada vez que se abre S09 (también al volver a la pestaña); no hay actualización en vivo. | 02-navigation S09, 05-ui §5 |
| R8 | **Permisos (nivel 3, se aprueban con esta spec):** solo `grant select` de `mi_racha` a `authenticated`, que lee con las RLS de `prediccion` y `calificacion` (solo lo propio); `anon` sin acceso. Sin funciones `security definer`. La racha de otros (S13, F19) queda fuera. | D14, D35 |

## Flujo
**Servidor:** migración con la vista `mi_racha` (R6) y su permiso (R8).

**App:** S09 pide `mi_racha` (Zod) y pinta R7 entre el perfil y los ajustes.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de los dos números (05-ui §6). |
| Error / sin conexión | En la sección, "No pudimos cargar tu racha." (sin conexión, el texto de F01 §10) + "Reintentar"; el resto de S09 sigue usable. |
| Sin calificaciones | El texto de R7 en lugar de los números. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Con la secuencia acierto, acierto, fallo, acierto, acierto, acierto (por inicio del partido, calificados en otro orden), la racha actual es 3 y la mejor 3; con un fallo al final, la actual es 0 y la mejor 3. | [prueba] pgTAP |
| CA2 | Un partido cancelado no rompe la racha; un partido terminado sin mi predicción tampoco (decisión 2). | [prueba] pgTAP |
| CA3 | Una predicción con puntos base > 0 cuenta como acierto (incluido el marcador fallado con partes acertadas) y una con 0 la rompe (decisión 1). | [prueba] pgTAP |
| CA4 | Cuentan los partidos de todos los torneos, en orden de inicio (una racha sigue de un torneo al siguiente); los simulados cuentan y `incluye_simulados` lo indica. | [prueba] pgTAP |
| CA5 | Sin calificaciones devuelve 0 y 0; cada usuario lee solo su racha; `anon` no tiene acceso. | [prueba] pgTAP |
| CA6 | S09 muestra la racha actual y la mejor, el texto sin calificaciones, la nota de simulados solo cuando aplica, y el error con "Reintentar" sin romper el resto de S09. | [prueba] jest |
| CA7 | Predecir y acertar 3 simulados seguidos deja la racha actual en 3; fallar el siguiente deja la actual en 0 y la mejor en 3. | [teléfono] |
| CA8 | La sección se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Insignias por racha (F14), racha de otros usuarios (F19), avisos de racha, rachas por grupo o por torneo, recalcular tras corregir un resultado (D47).
