# 01 — MVP: alcance, prioridades y plan

> **Estado:** ✅ Aprobado v1.5 (2026-11-07; demo el 23 de noviembre, S7 adelantada y congelamiento 20–22 por D98) · v1.4 (2026-11-02; plan replanteado y F12 a Must por D88) · v1.3 (2026-10-10; F11 dividida por D69, módulos por D66) · antes v1.2 (2026-10-04; v1.1 agrega F17–F20 por D39/D41; v1.2 agrega F21 y reordena Should por D42)
> **Última actualización:** 2026-11-07
> Base: [`00-project.md`](./00-project.md) (aprobado) y [`decisions.md`](./decisions.md).
> Este documento decide **qué entra y en qué orden**. El detalle de cada feature va en `features/Fxx-*.md`.

---

## 1. Flujo núcleo (lo mínimo que debe funcionar para que el MVP tenga sentido)

```
Iniciar sesión → Crear/unirse a un grupo → Ver partidos de la jornada
→ Predecir (+ justificar) antes del inicio → El partido termina
→ El sistema califica solo (puntos base + bono IA) → Ranking del grupo actualizado
```

Si una funcionalidad no aporta a este flujo o a la gamificación que lo hace atractivo, no entra.

## 2. Features y prioridad (MoSCoW)

**Must** = sin esto no hay MVP. **Should** = entra si el plan se cumple; es lo primero que se recorta. **Could** = solo si sobra tiempo. **Won't** = fuera (ver `00-project.md` §6).

| ID | Feature | Prioridad | Depende de | Nota |
|---|---|---|---|---|
| F01 | Inicio de sesión con Google y perfil básico | Must | — | D11 |
| F02 | Partidos de la Liga MX: sincronización y lista por jornada | Must | — | D24, D29 |
| F03 | Crear / editar predicción (resultado, rango de goles, marcador) | Must | F01, F02 | D19, D20, D21, D48 |
| F04 | Justificación en texto (oculta hasta el inicio del partido) | Must | F03 | D08 |
| F05 | Calificación automática de puntos base al terminar el partido | Must | F03 | D18, D26, D27 |
| F06 | Evaluación de la justificación con IA (bono 0–100 + explicación) | Must | F04, F05 | D08, P5 |
| F07 | Grupos privados: crear, unirse con código, ver miembros | Must | F01 | D20 |
| F08 | Rankings del grupo: torneo y jornada | Must | F05, F07 | D10 |
| F09 | Modo de partidos simulados | Must | F02 | D15 — necesario para probar F05/F06 sin esperar partidos |
| F10 | Historial de mis predicciones con desglose de puntos | Must | F05, F06 | Transparencia (P5) |
| F11a | Notificaciones: permiso, registro del dispositivo y recordatorio antes del partido | **Must** | F01, F02 | Funcionalidad nativa (D32, D69) |
| F11b | Notificación de puntos listos | **Must** | F05, F11a | D69 |
| F12 | Unirse a un grupo escaneando QR | **Must** | F07 | Funcionalidad nativa (cámara); Must por D88 |
| F13 | Rachas de aciertos | Should | F05 | P4: por aciertos, no por uso |
| F14 | Insignias en la "Vitrina" del perfil (incluye "top de la jornada" y "mejor análisis de la jornada") | Should | F06, F08, F13 | D10, D42 |
| F15 | Compartir resultado / ranking (hoja nativa de Android) | Should | F08 | D30 |
| F16 | Comentarios en justificaciones reveladas | Could | F04, F07 | D30 |
| F17 | Inicio: 3 bloques fijos (próximo partido de mi equipo, pendientes de predecir, mis grupos) | Should | F02, F03, F07, F18 | D39; si se recorta, la inicial es Partidos |
| F18 | Equipo favorito (Liga MX) | Should | F01, F02 | D39 |
| F19 | Perfil de otro usuario (solo lectura) | Should | F01, F07 | D38, D39 |
| F20 | Carta de usuario con atributos estilo FIFA (media y atributos calculados; sin personalización ni sobres) | Could | F05, F06, F13 | D41, D42 — la primera en entrar si sobra tiempo |
| F21 | Previa del partido (forma últimos 5, tabla, enfrentamientos directos) dentro del detalle de partido | Should | F02 | D42 |

**Prioridad de los Should (de mayor a menor, D42; F12 sale por D88):** F13 Rachas → F14 Insignias → F21 Previa → F19 Perfil público → F17 Inicio → F18 Equipo favorito → F15 Compartir. Could: F20 Carta (primero) → F16 Comentarios.

**Dentro del plan (D88):** todos los Must y, solo si sobra tiempo en S7, F13 Rachas (entró y quedó terminada, D102). **F14–F21 quedan fuera del plan**; siguen en esta tabla como Should/Could por si el plan se adelanta.

**Orden de recorte si falta tiempo (inverso):** F16 → F20 → F15 → F18 → F17 → F19 → F21 → F14 → F13. Ningún Must se recorta; si un Must está en riesgo, se reduce su alcance (y se actualiza su spec), no se elimina.

## 3. Definición de "terminado" (aplica a cada feature)

1. Cumple **todos** los criterios de aceptación de su spec.
2. Pruebas automatizadas de las reglas de negocio pasan.
3. Se contemplan los estados: cargando, con datos, vacío, error (sin internet / API caída).
4. Jesús la probó en su Android y la **aprobó**.
5. La spec está actualizada si algo cambió durante la implementación.

## 4. Plan semanal (D88, fechas de S7–S8 por D98; reemplaza el de D33)

**Demo: lunes 23 de noviembre de 2026** (D98). Un commit por tarea (D59). S1 (5–11 oct) fue de especificación y diseño; M1 (S2) cerró el 2 de noviembre (D87), así que el plan original ya no era alcanzable.

| Semana | Fechas | Módulo | Features |
|---|---|---|---|
| S5 | 2–8 nov | M2 Predecir | F03, F04, F09, F11a |
| S6 | 2–7 nov (adelantada) | M3 Calificar | F05, F06, F10, F11b |
| S7 | 9–19 nov (adelantada) | M4 Competir | F07, F08, F12 · F13 solo si las tres están aprobadas en el teléfono a más tardar el 17 nov |
| S8 | 20–22 nov | **Congelamiento:** sin features nuevas; corregir, medir el tamaño y ensayar la demo. | — |

**API-Football Pro (D24, D25):** 1 mes desde el 9 de noviembre (cubre la demo y la entrega); con él se pasa a la temporada 2026 al inicio de M4 (`tasks/S7.md` T63).

### 4.1 Módulos (D66, D88)

| Módulo | Semana | Features | Qué se puede probar al terminarlo |
|---|---|---|---|
| **M1 Base** | S2 (cerró el 2 nov) | Configuración, F01, F02 | Entrar con Google y ver los partidos |
| **M2 Predecir** | S5 (cerró el 2 nov, D93) | F03, F04, F09, F11a | Predecir, justificar, simular un partido y recibir el recordatorio |
| **M3 Calificar** | S6 (cerró el 7 nov, D96) | F05, F06, F10, F11b | El partido (simulado o real) termina y llegan puntos y bono de IA |
| **M4 Competir** | S7 (9–19 nov, D98) | F07, F08, F12, (F13) | Grupos, rankings, unirse con QR |

Fuera del plan (D88): F14–F21.

Ciclo de cada módulo: specs → revisión → tareas → implementación por lotes → pruebas → validación de Jesús → actualizar specs. Las specs del módulo siguiente se escriben mientras Jesús valida el actual (D66). La validación en el teléfono es **una por feature**, con su guion; Jesús puede juntarlas al final del módulo.

**Dependencias nativas:** las que faltan para el MVP (notificaciones de F11a; cámara y generación de QR de F12) entran juntas en una sola development build en M2, con la medición de tamaño contra el tope (D79, actualizado en D91).

**Riesgo del plan:** M3 (IA) y M4 (grupos, rankings y QR + paso a datos reales 2026) son los módulos más cargados. M3 se prueba con partidos simulados (F09), por eso F09 se termina en M2. Si M4 se atrasa, F13 no entra y S8 (20–22 nov) absorbe la estabilización; el congelamiento no se acorta.

## 5. Criterio de éxito del MVP

Es el de `00-project.md` §9: en la demo, 3+ usuarios en un grupo predicen; el partido termina (real o simulado) y **sin intervención manual** reciben puntos base y bono con explicación; los rankings se actualizan; se otorga al menos una racha o insignia (si F13/F14 entraron).

## 6. Pendientes de este documento

Ninguno. M-01 y M-02 aprobados (D32, D33).
