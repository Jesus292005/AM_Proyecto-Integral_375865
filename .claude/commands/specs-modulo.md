---
description: Escribe las specs y el archivo de tareas de un módulo completo, listos para aprobar
argument-hint: M2
---

Escribe las specs del módulo **$ARGUMENTS** (features en `specs/01-mvp.md` §4.1) y su archivo de tareas.

Antes: lee `specs/01-mvp.md`, `specs/02-navigation.md`, `specs/03-data-model.md`, las filas de `specs/decisions.md` que citan esas features y `specs/features/F02-partidos.md` como ejemplo de nivel de detalle. No repitas lo que ya dicen esos documentos: cítalos.

## 1. Una spec por feature: `specs/features/Fxx-nombre.md`

    # Fxx — Nombre
    > **Estado:** Borrador · **Prioridad:** Must · **Módulo:** M2 · **Depende de:** … · **Pantallas:** S03 · **Decisiones:** D…

    ## Decisiones para Jesús   (máximo 5 en total; si no hay, "Ninguna")
    | # | Pregunta | A (recomendada) | B | Consecuencia |

    ## Objetivo                 (2–3 líneas)
    ## Reglas                   (tabla ID | Regla | Origen; solo lo que no está en 03-data-model §3)
    ## Flujo                    (pasos numerados; servidor y app por separado si aplica)
    ## Estados de pantalla      (solo los que difieren de 05-ui §6)
    ## Criterios de aceptación  (CA1…; cada uno verificable y marcado [prueba] o [teléfono])
    ## Fuera de alcance

Todo lo que puedas resolver con los patrones de F01/F02 y las decisiones existentes, resuélvelo sin preguntar (nivel 1–2 de `CLAUDE.md`). En "Decisiones para Jesús" van solo las de nivel 3.

## 2. Archivo de tareas: `specs/tasks/Sx.md`

    | ID | Tarea | Cubre | Lote | Estado | Supuestos |

- Tareas pequeñas que se pueden probar por separado, numeradas después de la última que exista.
- **Lotes:** un lote reúne las tareas que Claude puede hacer de corrido sin que Jesús intervenga. Una acción 👤 (`db push`, development build, credenciales, consola) cierra un lote y se escribe como una tarea 👤 aparte.
- Junta en **una sola tarea 👤** todas las dependencias nativas que el resto de los módulos va a necesitar, para hacer una sola development build.
- Al final: "Guion de validación del módulo" (pasos en el teléfono que cubren los criterios [teléfono]).

## 3. Respuesta
Solo esto: la lista de archivos creados, las "Decisiones para Jesús" de todas las specs juntas (numeradas) y los lotes en una línea cada uno. Sin resumen de las specs.
