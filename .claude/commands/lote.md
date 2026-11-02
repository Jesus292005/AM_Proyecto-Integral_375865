---
description: Ejecuta un lote de tareas de la semana sin pedir aprobación entre tareas
argument-hint: L2 | T33-T36
---

Ejecuta el lote **$ARGUMENTS** del archivo de tareas de la semana en curso (`specs/tasks/`).

Sigue "Trabajo por lotes", "Niveles de decisión" y "Verificaciones" de `CLAUDE.md`:
- Haz las tareas en orden, cada una con sus pruebas (nombradas con el id del criterio) y sus verificaciones.
- Decisiones de nivel 1: no las menciones. Nivel 2: una línea en "Supuestos". Nivel 3: detén solo esa tarea y sigue con las que no dependan de ella.
- Marca cada tarea en el archivo de tareas (✅ o ⏸).
- Al final, corre el subagente `revisor` con el id del lote, sus tareas y la spec; corrige lo que sea nivel 1–2.

Termina únicamente con el **reporte del lote** en el formato de `CLAUDE.md`. Nada más.
