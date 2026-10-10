# Backlog — visión a futuro (fuera del MVP escolar)

> **Estado:** Ideas registradas, **no aprobadas para implementar**. Nada de aquí entra al MVP sin pasar por `01-mvp.md` y `decisions.md`.
> **Última actualización:** 2026-10-04
> Filtro para cualquier idea: principios P1–P5 de `00-project.md` (sin dinero real, premiar análisis y no riesgo, nunca restar por fallar en el modo casual, sin recompensas aleatorias ni por frecuencia de uso, transparencia).

---

## 1. Progresión y competencia (visión de Jesús)

| ID | Idea | Notas / riesgos |
|---|---|---|
| B01 | **XP y nivel:** los puntos que nunca restan se convierten en XP; el usuario sube de nivel. | La XP debe venir de **aciertos y análisis**, no de abrir la app (P4). |
| B02 | **Modo competitivo con ELO** que sube y baja. | Se separa del modo casual: XP = progreso (no baja), ELO = habilidad (sí baja). Riesgo: "perseguir pérdidas" (patrón típico de las apuestas). Mitigación natural: una predicción por partido y el ELO cambia una vez por jornada; no hay forma de "recuperar" jugando más. |
| B03 | **Divisiones con ascenso y descenso** (estilo Division Rivals). | Resuelve el límite de grupos pequeños: compites con desconocidos de tu nivel en grupos de ~20. |
| B04 | **Informs evolutivos:** los mejores predictores de la semana reciben una carta especial; cada nuevo inform en la temporada tiene **media más alta**; se pueden acumular varios. | Se ganan solo por desempeño; nunca se compran ni salen al azar. |
| B05 | **Carta completa con atributos** (precisión, análisis, marcadores, etc.). | Base: F20 del MVP. Requiere tamaño mínimo de muestra para que la media signifique algo. |
| B06 | **Duelos 1 contra 1** por jornada dentro del grupo. | Alimenta el ELO de forma natural (es un enfrentamiento directo). |
| B07 | **Vitrina de trofeos por torneo** (campeón del grupo, top 3, mejor analista del torneo). | Los trofeos de torneo solo existen al cerrar el torneo. |
| B08 | **Predicciones de temporada:** campeón, superlíder, goleador. | |
| B09 | **Quiniela de liguilla** (llaves completas antes de que empiece). | Encaja con el formato de la Liga MX. |
| B17 | **Más formas de predecir goles** (distintos rangos). | Pedido por Jesús; cuidar que no se parezca a "over/under". |
| B16 | **"Pasa de ronda"** en partidos de liguilla (además del resultado de 90 minutos). | Complementa D43. |
| B10 | **Eventos por tiempo limitado:** semana de clásico, liguilla, fecha FIFA. | Evitar eventos diarios que generen miedo a perderse algo (FOMO). |
| B11 | **Liga de aficiones:** suma de puntos por afición de cada club ("¿qué afición sabe más?"). | Usa el equipo favorito (F18). |
| B12 | **Ligas públicas de creadores / analistas** con historial verificable. | Cumple el problema original: registro objetivo de quién sabe. |

## 2. Análisis

| ID | Idea | Notas |
|---|---|---|
| B13 | **Coach de IA:** después de calificar, sugiere cómo mejorar el análisis. | Costo de IA por usuario. |
| B14 | **Estadísticas personales:** en qué aciertas más, tus puntos débiles. | |
| B15 | **Previa ampliada:** lesiones, alineaciones probables. | Más consultas a la API. |

## 3. Obligatorio antes de publicar

| ID | Requisito | Notas |
|---|---|---|
| B18 | **Eliminar cuenta** desde la app y desde la web. | Exigido por Google Play para apps con creación de cuenta (F01-Q3). |
| B19 | **Iniciar sesión con Apple** (si se publica en iOS con login de Google). | D53. |

## 4. Monetización (para cuando haya usuarios)

| ID | Opción | Encaja con el propósito | Notas |
|---|---|---|---|
| M1 | **Suscripción premium** (previa avanzada, coach de IA, estadísticas personales, ligas grandes). | Sí, si **nunca da ventaja en puntos** (no "pagar para ganar"). | La fuente más sana y predecible. |
| M2 | **Cosméticos de compra directa** (diseños de carta, marcos, temas). | Sí, si se compran directo, **nunca en sobres o al azar**. | |
| M3 | **Patrocinios de eventos y ligas** (marcas, bares deportivos, medios). | Sí. | Ej.: un bar organiza la liga de sus clientes. |
| M4 | **Anuncios.** | Con condición. | El inventario de anuncios deportivos en México está dominado por casas de apuestas: hay que **bloquear la categoría de apuestas** en la red de anuncios, o la app termina promoviendo lo que combate. |
| — | **Prohibido:** entrada pagada con premios, monedas que se compran para predecir, sobres. | No. | Entrada pagada + premio = apuesta. Concursos con premios en México pueden requerir permiso de Gobernación (revisar con un abogado antes). |

**Costos a cubrir:** API de datos (~19–39 USD/mes), IA (centavos por evaluación; poner tope por usuario), backend y base de datos (gratis al inicio, escalan con usuarios), cuenta de Google Play (pago único).
