# F18 — Equipo favorito
> **Estado:** ✅ **Terminada** (2026-11-22, D110: cumple CA1–CA5 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-21, D108) · **Prioridad:** Must del rediseño (antes Should, D39, D104) · **Módulo:** M6 Identidad · **Depende de:** F01, F02, F22 · **Pantallas:** S12, S09 · **Decisiones:** D39, D52, D78, D104, F01 V3

## Decisiones (D108)
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 2 | ¿Cuándo se puede cambiar el equipo favorito? | **Cuando quiera.** | Una vez por torneo. | A es lo más simple y no necesita reglas en el servidor. Si después entra la Liga de aficiones (B11), habrá que limitarlo para que nadie cambie de afición para sumar. |

## Objetivo
Elegir tu equipo de la Liga MX para que la app lo muestre como parte de tu identidad (perfil, barra superior y carta) y, en M7, para el bloque de tu equipo en Inicio.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **S12** (modal `/equipo`, ya existe provisional, 02-navigation §2): los equipos del **torneo actual** ordenados por nombre corto, cada uno con `EscudoEquipo` (`escudoLista`) y su nombre corto. El elegido como en `Opciones` (`superficie2`, borde `acento` y check). Al final, "Sin equipo favorito". | D39, F22 R3 |
| R2 | Tocar un equipo lo guarda en `Usuario.equipoFavoritoId` y cierra el modal (sin historial, D78). Tocar el que ya está elegido cierra sin guardar. "Sin equipo favorito" lo quita. Se puede cambiar cuando quiera (decisión 2). | Decisión 2 |
| R3 | **Servidor:** vista `equipos_torneo_actual` (`security_invoker`) con `id`, `nombre_corto`, `escudo_url`, `color_primario` y `color_texto` de los equipos con algún partido del torneo actual, una vez cada uno. El guardado usa el permiso que ya existe (`update (equipo_favorito_id)` de la fila propia, F01 V3). | D52 |
| R4 | **Permisos (nivel 3, se aprueban con esta spec):** `grant select` de `equipos_torneo_actual` a `authenticated`; `anon` sin acceso. `equipo` ya lo leen todos los usuarios autenticados (F02). | F02 |
| R5 | **Dónde se ve:** encabezado de S09 (F28 R1), barra superior (F25) y carta (F20). Un equipo favorito que ya no juega el torneo actual (p. ej. Mazatlán de 2024) se sigue mostrando; en S12 no aparece en la lista y ninguna fila sale marcada. | — |

## Flujo
**Servidor:** migración con la vista de R3 y su permiso (R4).

**App:** S09 → "Equipo favorito" (o "Elige tu equipo") → S12 → tocar un equipo → guarda → cierra → S09 y la barra se actualizan (misma caché del perfil, F28 R7).

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de 6 filas (círculo y barra). |
| Error al cargar | Mensaje y "Reintentar" (05-ui §6). |
| Guardando | La fila tocada con el indicador de carga; las demás deshabilitadas. |
| Error al guardar | "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." arriba de la lista; el modal sigue abierto. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `equipos_torneo_actual` devuelve cada equipo del torneo actual una sola vez (18 con el Apertura de prueba) y `anon` no la lee. | [prueba] pgTAP |
| CA2 | Un usuario cambia y quita su equipo favorito, pero no el de otro. | [prueba] pgTAP |
| CA3 | S12 marca el elegido; tocar otro lo guarda y cierra; "Sin equipo favorito" lo quita; un error lo dice sin cerrar. | [prueba] jest |
| CA4 | Elegir y cambiar de equipo, y verlo en S09, en la barra superior y en la carta. | [teléfono] |
| CA5 | S12 se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Bloque "Tu equipo" de Inicio (F17 v2, M7), Liga de aficiones (B11), avisos de partidos de tu equipo, equipos de otras ligas.
