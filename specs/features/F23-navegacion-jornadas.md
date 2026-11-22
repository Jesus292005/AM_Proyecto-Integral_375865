# F23 — Navegación por jornadas
> **Estado:** ✅ **Terminada** (2026-11-21, D107: cumple CA1–CA5 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-21, D105) · **Prioridad:** Must del rediseño · **Módulo:** M5 Base visual · **Depende de:** F02, F03, F22 · **Pantallas:** S02 · **Decisiones:** D57, D78, D86, D104, D105

## Decisiones (D105)
1. **Selector:** **(A, recomendada)** una **tira horizontal** con todas las jornadas del torneo que se desliza y se centra sola en la elegida: un toque y llegas. **(B)** un botón con el nombre de la jornada que abre una lista para elegir. A deja ver dónde estás dentro del torneo sin abrir nada.
2. **Filtro "Sin predecir":** **(A, recomendada)** filtra **solo la jornada que estás viendo**. **(B)** junta los pendientes de todas las jornadas. B se encima con el bloque de pendientes de Inicio (M7).

## Objetivo
Que moverse por el torneo sea inmediato (hoy, ir de la jornada 17 a la 1 son 16 toques) y que encontrar lo que falta por predecir no requiera revisar partido por partido.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **`TiraJornadas`** (reemplaza a `SelectorJornada`): un elemento por jornada del torneo actual, en orden (`orden`). Fase regular: "J1" … "J17". Liguilla, con su nombre corto: "Play-in", "Cuartos", "Semis", "Final" (A7 de F02). Área táctil mínima 44 × 44. | F02 A7, 05-ui §4 |
| R2 | La **elegida** en `superficie2` con borde `acento`; la **jornada actual** (la del servidor, D86) lleva además un punto en `acento` debajo, aunque no esté elegida. Al abrir S02 o cambiar de jornada, la tira se desplaza para dejar la elegida al centro. | D86, U4, U5 |
| R3 | Tocar una jornada cambia el parámetro `jornada` **sin agregar historial** (D78), igual que hoy. Si el torneo tiene una sola jornada, la tira se muestra igual (sin flechas). | D78 |
| R4 | **"Sin predecir"** (`ChipFiltro`, 05-ui v2 §5) a la derecha del título de la jornada. Activo: muestra solo los partidos **por jugar**, con predicciones abiertas y **sin** predicción mía (decisión 2: solo la jornada actual de la tira). Se queda activo al cambiar de jornada y se apaga al salir de la pestaña (no viaja en la ruta). | F03 R1 |
| R5 | Con el filtro activo y nada pendiente: "Ya predijiste todo lo que se puede en esta jornada." + botón "Ver todos" que apaga el filtro. | 05-ui §6 |
| R6 | Las jornadas y la jornada actual salen de la consulta que ya usa S02 (`obtenerTorneoActual`, misma caché); el filtro trabaja sobre los partidos ya cargados (`mis_predicciones`). Sin consultas ni cambios nuevos en el servidor. | D52 |

## Flujo
**App (S02):** título de la jornada + `ChipFiltro` → `TiraJornadas` → lista agrupada por día (sin cambios, F02 CA9). Tocar una jornada actualiza la lista; tocar el filtro la reduce.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto de la tira (4–5 bloques) y de la lista. |
| Jornada sin partidos | El texto de F02 ("No hay partidos en esta jornada."). |
| Filtro sin pendientes | R5. |
| Error / sin conexión | Los de F02 (sin cambios). |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | La tira muestra todas las jornadas del torneo con su etiqueta (fase regular y liguilla), marca la elegida y la actual, y tocar una abre sus partidos sin agregar historial. | [prueba] jest |
| CA2 | Con "Sin predecir" activo solo quedan los partidos por jugar, abiertos y sin mi predicción; sin pendientes se ve R5 y "Ver todos" apaga el filtro. | [prueba] jest |
| CA3 | El filtro sigue activo al cambiar de jornada. | [prueba] jest |
| CA4 | Desde la jornada actual se llega a la J1 con un desplazamiento y un toque; al volver a S02, la elegida queda centrada. | [teléfono] |
| CA5 | S02 se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Pendientes de todas las jornadas (bloque de Inicio, M7), filtro por equipo, jornadas de torneos anteriores.
