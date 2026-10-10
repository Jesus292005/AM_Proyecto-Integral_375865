# 01 — MVP: alcance, prioridades y plan

> **Estado:** ✅ Aprobado v1.3 (2026-10-10; F11 dividida por D69, módulos por D66) · antes v1.2 (2026-10-04; v1.1 agrega F17–F20 por D39/D41; v1.2 agrega F21 y reordena Should por D42)
> **Última actualización:** 2026-10-03
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
| F12 | Unirse a un grupo escaneando QR | Should | F07 | Funcionalidad nativa (cámara) |
| F13 | Rachas de aciertos | Should | F05 | P4: por aciertos, no por uso |
| F14 | Insignias en la "Vitrina" del perfil (incluye "top de la jornada" y "mejor análisis de la jornada") | Should | F06, F08, F13 | D10, D42 |
| F15 | Compartir resultado / ranking (hoja nativa de Android) | Should | F08 | D30 |
| F16 | Comentarios en justificaciones reveladas | Could | F04, F07 | D30 |
| F17 | Inicio: 3 bloques fijos (próximo partido de mi equipo, pendientes de predecir, mis grupos) | Should | F02, F03, F07, F18 | D39; si se recorta, la inicial es Partidos |
| F18 | Equipo favorito (Liga MX) | Should | F01, F02 | D39 |
| F19 | Perfil de otro usuario (solo lectura) | Should | F01, F07 | D38, D39 |
| F20 | Carta de usuario con atributos estilo FIFA (media y atributos calculados; sin personalización ni sobres) | Could | F05, F06, F13 | D41, D42 — la primera en entrar si sobra tiempo |
| F21 | Previa del partido (forma últimos 5, tabla, enfrentamientos directos) dentro del detalle de partido | Should | F02 | D42 |

**Prioridad de los Should (de mayor a menor, D42):** F13 Rachas → F14 Insignias → F21 Previa → F12 QR → F19 Perfil público → F17 Inicio → F18 Equipo favorito → F15 Compartir. Could: F20 Carta (primero) → F16 Comentarios.

**Orden de recorte si falta tiempo (inverso):** F16 → F20 → F15 → F18 → F17 → F19 → F12 → F21 → F14 → F13. Ningún Must se recorta; si un Must está en riesgo, se reduce su alcance (y se actualiza su spec), no se elimina.

## 3. Definición de "terminado" (aplica a cada feature)

1. Cumple **todos** los criterios de aceptación de su spec.
2. Pruebas automatizadas de las reglas de negocio pasan.
3. Se contemplan los estados: cargando, con datos, vacío, error (sin internet / API caída).
4. Jesús la probó en su Android y la **aprobó**.
5. La spec está actualizada si algo cambió durante la implementación.

## 4. Plan semanal (propuesta)

Mínimo 3 commits por semana. Fecha de entrega: finales de noviembre (P-07).

| Semana | Fechas | Objetivo | Features |
|---|---|---|---|
| S1 | 5–11 oct | **Especificación y diseño:** aprobar este MVP, navegación, modelo de datos, specs de los Must, elegir herramientas de backend/BD. | — |
| S2 | 12–18 oct | Base del proyecto (app + backend), development build, login, partidos 2024. | F01, F02 |
| S3 | 19–25 oct | Predicciones, justificación, modo simulado y recordatorios. | F03, F04, F09, F11a |
| S4 | 26 oct–1 nov | Calificación automática, IA y aviso de puntos. | F05, F06, F10, F11b |
| S5 | 2–8 nov | Grupos, rankings y previa. **Contratar 1 mes de API** (según fecha de la demo) y pasar a temporada 2026. | F07, F08, F21 |
| S6 | 9–15 nov | Rachas, insignias y QR. | F13, F14, F12 |
| S7 | 16–22 nov | Perfil público, inicio, equipo favorito, compartir; ajustes con datos reales y corrección de errores. | F19, F17, F18, F15, (F20), (F16) |
| S8 | 23–29 nov | **Congelamiento:** sin features nuevas; estabilizar y ensayar la demo. | — |

### 4.1 Módulos (D66)

| Módulo | Semanas | Features | Qué se puede probar al terminarlo |
|---|---|---|---|
| **M1 Base** | S2 | Configuración, F01, F02 | Entrar con Google y ver los partidos |
| **M2 Predecir** | S3 | F03, F04, F09, F11a | Predecir, justificar y simular un partido |
| **M3 Calificar** | S4 | F05, F06, F10, F11b | El partido termina y llegan puntos y bono de IA |
| **M4 Competir** | S5 | F07, F08, F21 | Grupos, rankings y previa |
| **M5 Gamificación y QR** | S6 | F13, F14, F12 | Rachas, insignias, QR |
| **M6 Pulido** | S7 | F19, F17, F18, F15, (F20, F16) | Perfil público, inicio, compartir, carta |

Ciclo de cada módulo: specs → revisión → tareas → implementación → pruebas → validación de Jesús → actualizar specs. Las specs del módulo siguiente se escriben mientras Jesús valida el actual.

**Riesgo del plan:** S4 (IA) y S7 (4 Should + datos reales) son las semanas más cargadas. Las semanas tempranas tienen los Should de mayor prioridad, así que un retraso recorta primero los de menor prioridad.

## 5. Criterio de éxito del MVP

Es el de `00-project.md` §9: en la demo, 3+ usuarios en un grupo predicen; el partido termina (real o simulado) y **sin intervención manual** reciben puntos base y bono con explicación; los rankings se actualizan; se otorga al menos una racha o insignia (si F13/F14 entraron).

## 6. Pendientes de este documento

Ninguno. M-01 y M-02 aprobados (D32, D33).
