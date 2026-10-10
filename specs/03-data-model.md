# 03 — Modelo de datos (conceptual)

> **Estado:** ✅ Aprobado v1.0 (2026-10-04, D49)
> **Última actualización:** 2026-10-04
> Base: [`01-mvp.md`](./01-mvp.md), [`02-navigation.md`](./02-navigation.md), [`decisions.md`](./decisions.md).
> Este documento describe **qué datos existen y cómo se relacionan**. No decide dónde viven (base de datos, tablas, colecciones): eso es la fase de Diseño.
> Requisitos de diseño heredados: varias ligas y temporadas (visión a futuro), datos marcados como simulados (D40), estadísticas suficientes para la carta (D41).

---

## 1. Mapa de entidades

```
Liga 1──* Torneo 1──* Jornada 1──* Partido *──2 Equipo
                                       │ 1
                     ┌─────────────────┼──────────────────┐
                     *                 *                  1
              EstadisticaPartido  EventoPartido      PreviaPartido
                                       
Usuario 1──* Prediccion *──1 Partido
              │ 1
              ├──0..1 Calificacion          (puntos base)
              ├──0..1 EvaluacionIA          (bono de la justificación)
              └──*   Comentario             (F16, Could)

Usuario *──* Grupo   (a través de MiembroGrupo)
Usuario 1──* InsigniaObtenida *──1 Insignia
Usuario 1──* Dispositivo                    (tokens de notificación)
Usuario *──0..1 Equipo                      (equipo favorito)
Torneo 1──* PosicionTabla *──1 Equipo       (tabla general, F21)
```

**Rankings y rachas no son entidades guardadas por obligación:** se calculan a partir de `Calificacion` y `EvaluacionIA` (ver §4). Si guardarlos precalculados conviene por rendimiento se decide en Diseño.

## 2. Entidades

> Convenciones: `?` = opcional. Todas las fechas se guardan en **UTC**; se muestran en la zona horaria del teléfono. `proveedorId` = identificador en API-Football.

### Datos de fútbol (se llenan por sincronización con la API)

**Liga** — `id`, `proveedorId` (Liga MX = 262), `nombre`, `pais`.

**Torneo** — una mitad de temporada con su propio campeón (Apertura / Clausura).
`id`, `ligaId`, `nombre` ("Apertura 2026"), `temporadaProveedor` (2026), `prefijoRondas` ("Apertura"), `fechaInicio`, `fechaFin`, `esActual`.
> Nota: en API-Football una "temporada" contiene **dos** torneos (p. ej. 2024 = Apertura 2024 + Clausura 2025); por eso Torneo es una entidad propia.

**Jornada** — `id`, `torneoId`, `orden` (1–17 fase regular; 18+ rondas de liguilla), `nombre` ("Jornada 10", "Liguilla · Cuartos"), `nombresProveedor` (nombres de ronda de la API que agrupa), `fase` (`REGULAR` | `LIGUILLA`; una jornada por ronda de liguilla, D57), `fechaInicio`, `fechaFin`, `estaCerrada` (todos sus partidos calificados).

**Equipo** — `id`, `proveedorId`, `nombre`, `nombreCorto`, `escudoUrl`.

**Partido** — `id`, `proveedorId`, `torneoId`, `jornadaId`, `equipoLocalId`, `equipoVisitanteId`, `inicio` (fecha y hora), `estado` (`PROGRAMADO` | `EN_JUEGO` | `TERMINADO` | `POSPUESTO` | `CANCELADO`), `golesLocal?`, `golesVisitante?`, `golesLocalMedioTiempo?`, `golesVisitanteMedioTiempo?`, `esSimulado`, `partidoOrigenId?` (partido de 2024 del que se copió, si es simulado), `calificadoEn?`, `sincronizadoEn`.

**EstadisticaPartido** — `partidoId`, `equipoId`, `tipo` ("Ball Possession", "Total Shots"…), `valor?`.
> `valor` vacío = **sin dato**, nunca se interpreta como 0 (D29).

**EventoPartido** — `partidoId`, `equipoId`, `minuto`, `minutoAgregado?`, `tipo` (`GOL` | `TARJETA` | `CAMBIO` | `VAR`), `detalle` ("Penalty", "Yellow Card"…).

**PosicionTabla** (F21) — `torneoId`, `equipoId`, `posicion`, `puntos`, `jugados`, `ganados`, `empatados`, `perdidos`, `golesFavor`, `golesContra`, `actualizadoEn`.

**PreviaPartido** (F21) — `partidoId`, `enfrentamientosDirectos` (lista: fecha, local, visitante, marcador), `actualizadoEn`.
> La **forma de los últimos 5** no se guarda: se calcula con los `Partido` terminados de cada equipo.

### Usuarios y grupos

**Usuario** — `id`, `googleId`, `nombre`, `correo`, `fotoUrl?`, `equipoFavoritoId?` (F18), `rol` (`USUARIO` | `ADMIN`), `recordatoriosActivos` (F11), `creadoEn`.

**Dispositivo** (F11) — `usuarioId`, `tokenNotificaciones`, `actualizadoEn`. Un usuario puede tener varios.

**Grupo** — `id`, `nombre`, `codigoInvitacion` (único), `creadorId`, `creadoEn`.
> El grupo **no** pertenece a un torneo: dura entre torneos y su ranking se calcula por torneo.

**MiembroGrupo** — `grupoId`, `usuarioId`, `rol` (`ADMIN` | `MIEMBRO`), `unidoEn`.

### Predicciones y puntos

**Prediccion** — `id`, `usuarioId`, `partidoId`, `resultado?` (`LOCAL` | `EMPATE` | `VISITANTE`), `rangoGoles?` (`G0_1` | `G2` | `G3` | `G4_MAS`, D48), `marcadorLocal?`, `marcadorVisitante?`, `justificacion?`, `creadaEn`, `actualizadaEn`.

**Calificacion** (puntos base, F05) — `prediccionId`, `puntosResultado`, `puntosRangoGoles`, `puntosMarcador`, `puntosBase`, `esSimulada`, `calificadaEn`.

**EvaluacionIA** (bono, F06) — `prediccionId`, `estado` (`PENDIENTE` | `EVALUADA` | `ERROR`), `puntosBono` (0–100), `explicacion`, `afirmaciones` (lista: texto, veredicto `ACERTADA` | `CERCANA` | `FALLADA` | `NO_VERIFICABLE`, motivo), `intentos`, `evaluadaEn?`.
> Solo existe si la predicción tiene justificación.

**Comentario** (F16, Could) — `id`, `prediccionId`, `usuarioId`, `texto`, `creadoEn`.

### Gamificación

**Insignia** (catálogo) — `id`, `codigo` ("TOP_JORNADA", "MEJOR_ANALISIS", "VISIONARIO"…), `nombre`, `descripcion`, `icono`, `repetible`.
> El catálogo exacto se define en la spec de F14.

**InsigniaObtenida** — `usuarioId`, `insigniaId`, `obtenidaEn`, `grupoId?`, `jornadaId?`, `partidoId?`, `esSimulada`.
> Una insignia repetible (p. ej. top de la jornada) genera un registro por cada vez que se gana.

### Operación

**Sincronizacion** — `tipo` (partidos, estadísticas, tabla…), `inicio`, `fin`, `estado`, `consultasUsadas`, `error?`.
> Sirve para no pasarse del límite de consultas de la API y para diagnosticar fallas.

**NotificacionEnviada** (F11) — `usuarioId`, `tipo` (`RECORDATORIO` | `PUNTOS_LISTOS`), `partidoId`, `enviadaEn`.
> Evita mandar la misma notificación dos veces.

## 3. Reglas que el modelo debe garantizar

| ID | Regla | Origen |
|---|---|---|
| R01 | Una sola `Prediccion` por par (usuario, partido); cuenta para todos sus grupos. | D20 |
| R02 | Una predicción tiene al menos uno de: resultado, rango de goles o marcador. Si tiene marcador, **no** tiene resultado ni rango por separado (se deducen). | D19, D48 |
| R03 | Solo se crea o edita una predicción si la hora del servidor es anterior a `Partido.inicio`. | D21 |
| R04 | Las predicciones de otros solo se entregan a quien comparte un grupo con su autor y a partir de `Partido.inicio`. Lo aplica el backend. | D35 |
| R05 | Puntos: resultado 100, rango de goles 150, marcador exacto 350; marcador fallado = suma de las partes deducidas acertadas (máx. 250). Fallar = 0. Se usa el resultado de 90 minutos. | D18, D26, D27, D43, D48 |
| R06 | Una predicción se califica **una sola vez**, cuando su partido está `TERMINADO`. | F05 |
| R07 | La justificación solo suma bono (0–100); nunca resta. | D08 |
| R08 | Todo lo que proviene de un partido simulado queda marcado como simulado. | D40 |
| R09 | Ranking de torneo del grupo = suma de puntos (base + bono) de los miembros actuales en partidos del torneo, desde la jornada 1. Ranking de jornada = lo mismo, filtrado por jornada. | D10 |
| R10 | Las claves de servicios externos nunca se guardan en la app. | D14 |

## 4. Datos derivados (se calculan, no se capturan)

| Dato | Se calcula con | Feature |
|---|---|---|
| Ranking del torneo y de la jornada | Calificacion + EvaluacionIA + MiembroGrupo | F08 |
| Racha actual y máxima | Calificaciones del usuario ordenadas por `Partido.inicio` | F13 |
| Forma de los últimos 5 | Partidos terminados del equipo | F21 |
| Termómetro del grupo (% por resultado) | Predicciones de los miembros (desde el inicio) | backlog |
| Atributos de la carta | Calificaciones y evaluaciones del usuario por torneo | F20 |

## 5. Pendientes

Ninguno. Resueltos: DM-01 (D43), DM-02 (D48), DM-03 (D46), DM-04 (D44), DM-05 (D47), DM-06 (D45).
