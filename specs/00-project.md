# 00 — Definición del proyecto

> **Estado:** ✅ Aprobado v1.0 (2026-10-03, D28) — v1.1 agrega evidencia específica de apuestas deportivas
> **Última actualización:** 2026-10-03 (v1.1)
> **Fase SDD:** Idea → **Problema** → Especificación → Diseño → Tareas → Implementación → Validación
> Las decisiones cerradas y pendientes viven en [`decisions.md`](./decisions.md). Este documento no menciona tecnologías a propósito.

---

## 1. Problema

Para un aficionado joven en México, **la forma más visible y "tangible" de demostrar que sabe de fútbol es apostar dinero** en aplicaciones de apuestas. Hoy no existe una alternativa que valide ese conocimiento con algo que le importe (prestigio frente a sus amigos, un registro de aciertos, competencia) **sin poner dinero en riesgo**.

Consecuencias:

1. **Riesgo económico y psicológico:** para "probar" lo que sabe, el aficionado arriesga dinero.
2. **Se premia el riesgo, no el análisis:** las mecánicas de apuestas (momios, combinadas) recompensan arriesgar más, no analizar mejor.
3. **El análisis se pierde:** los debates entre amigos sobre quién sabe más se quedan en chats y conversaciones; no hay registro objetivo de quién acierta ni de por qué.

**Lo que este proyecto NO pretende:** tratar o curar la ludopatía. Es una **alternativa sin dinero** que busca prevenir o sustituir el uso de apuestas como forma de validar el conocimiento futbolístico.

**Evidencia** (ver detalle y fuentes en la sección 10):

- Según la **ENCODAT 2025** (Secretaría de Salud; primera edición que mide apuestas; muestra de 19,200 personas), el **4.3%** de la población de 12 a 65 años apostó en los últimos 12 meses (≈ 3.97 millones). En adultos es **3.9%** y en hombres adultos **5.4%**.
- El **6.3%** de quienes apuestan cumple criterios de **juego problemático** (≈ 249 mil personas), más en hombres.
- Datos de transacciones digitales (STP, 2026): los **menores de 25 años son el segmento que más rápido crece** en apuestas digitales, y el **63.9%** de las transacciones se hace desde teléfono o tableta.

**Evidencia específica de apuestas deportivas** (la ENCODAT mide juegos de apuesta en general, no desagrega apuestas deportivas ni el rango 18–25):

- Las apuestas deportivas concentraron el **56.41% del mercado digital de apuestas en México en 2025** (citado por Infobae; la fuente original del dato no se identifica en la nota).
- Estudio comercial de Jumio (jun-2026): **43%** de los consumidores mexicanos encuestados planeaba hacer apuestas deportivas durante el Mundial 2026 (promedio global 33%). No publica muestra ni metodología.
- **Vacío:** no se encontró un dato oficial de apuestas deportivas por edad en México. Se decidió no hacer encuesta propia (D31).

**Cómo se usa esta evidencia:** apostar **no es mayoritario**, por lo que el proyecto **no** afirma que "la mayoría de los jóvenes apuesta". Afirma que es un **fenómeno en crecimiento, concentrado en jóvenes y hombres, que ocurre principalmente en el teléfono**, y que una parte relevante de quienes apuestan desarrolla juego problemático.

## 2. Usuario principal

**Aficionado mexicano de 18 a 25 años que sigue la Liga MX jornada a jornada y que ya apuesta en aplicaciones móviles** para demostrar lo que sabe y competir con sus amigos.

| Aspecto | Descripción |
|---|---|
| Qué quiere | Demostrar que sabe de Liga MX, ganarle a sus amigos, sentir la emoción de acertar. |
| Qué hace hoy | Apuesta en apps de apuestas; discute pronósticos con su grupo de amigos. |
| Qué le duele | Pierde dinero; no hay un registro de que "él sí sabía". |
| Por qué cambiaría | Competencia visible contra sus amigos, reconocimiento por acertar y por argumentar, progreso en su perfil, sin riesgo económico. |

**Usuario secundario:** el mismo perfil, pero que **todavía no apuesta** y se siente tentado. El diseño se hace para el usuario principal; el secundario se beneficia sin requerir funcionalidades propias.

**Supuesto honesto:** la app compite contra la emoción del dinero real. No se afirma que reemplace las apuestas; se afirma que ofrece una alternativa para validar conocimiento sin riesgo.

## 3. Propuesta de valor

> **Demuestra que sabes de Liga MX contra tus amigos: gana puntos por acertar y por argumentar bien, sin apostar un peso.**

## 4. Principios de diseño (se derivan del problema y aplican a todas las features)

| ID | Principio | Por qué |
|---|---|---|
| P1 | Sin dinero real ni premios canjeables. | Es la razón de existir del proyecto. |
| P2 | Se premia el análisis, no el riesgo: **sin momios y sin multiplicadores por combinar predicciones.** | Momios y combinadas son mecánicas de casas de apuestas. |
| P3 | Fallar da 0 puntos, nunca resta. La justificación **solo suma** (bono). | Fomenta participar y justificar. |
| P4 | Las recompensas premian **aciertos y calidad**, no la frecuencia de uso. **Sin recompensas aleatorias.** | Evitar los mecanismos de enganche que el proyecto critica. |
| P5 | Transparencia: el usuario siempre puede ver por qué recibió sus puntos. | Evitar reclamos en el ranking y dar confianza en la evaluación. |

## 5. Alcance preliminar (candidatas — se priorizan en `01-mvp.md`)

Estas funcionalidades **todavía no están aprobadas para el MVP**; son la lista a priorizar.

- Inicio de sesión con Google.
- Consultar partidos de la Liga MX (Apertura 2026).
- Hacer una predicción por partido: resultado (gana local / empate / gana visitante), marcador exacto, total de goles, o una combinación.
- Justificación en texto con bono evaluado por IA según lo que pasó en el partido.
- Calificación automática al terminar el partido.
- Grupos privados con código de invitación.
- Ranking del torneo y ranking por jornada dentro de cada grupo.
- Rachas de aciertos.
- Insignias (incluye "top de la jornada").
- Notificaciones (recordatorio previo al partido y aviso de puntos).
- Unirse a un grupo escaneando un código QR.
- Modo de partidos simulados para desarrollo y demo.

## 6. Fuera de alcance

| Elemento | Estado |
|---|---|
| Predicción de goleadores | Fuera (decidido) |
| iOS | Fuera (decidido): no hay dispositivo para probar |
| Datos en tiempo real / marcador en vivo | Fuera (decidido) |
| Dinero real, compras, premios canjeables | Fuera (decidido, P1) |
| Otras ligas distintas a Liga MX | Fuera (decidido) |
| Ranking global | Fuera del MVP (decidido) |
| Justificación por voz (reconocimiento de voz propio) | Fuera (decidido, D22) |
| Carta de jugador personalizable / títulos equipables | Fuera (decidido, D23) |
| Chat en tiempo real entre usuarios | **Propuesto fuera**; alternativas ligeras en P-12 |

## 7. Restricciones

| Restricción | Valor |
|---|---|
| Equipo | 1 desarrollador + Claude |
| Entrega | Finales de noviembre de 2026 (fecha exacta pendiente) |
| Presentación | Demo en vivo |
| Commits | Mínimo 3 por semana |
| Presupuesto | Menos de 600 MXN en total |
| Plataforma | Android |
| Liga / temporada | Liga MX Apertura 2026: fase regular termina el 22-nov; liguilla desde el 25-nov |
| Datos de partidos | API-Football: temporada 2024 gratis para desarrollo; 1 mes de plan Pro (~325 MXN) para la temporada 2026 y la demo (D24) |

## 8. Riesgos

| ID | Riesgo | Impacto | Mitigación propuesta |
|---|---|---|---|
| R1 | El plan gratis no da acceso a la temporada 2026 (**confirmado**). Los datos reales llegan tarde al desarrollo. | Problemas de integración descubiertos tarde. | Desarrollar con 2024 (mismo formato); reservar la primera semana del mes pagado para ajustes (D24). |
| R2 | El día de la demo no hay partido terminado que calificar. | Demo sin la función principal. | Modo de partidos simulados. |
| R3 | La IA califica de forma inconsistente o la manipulan con el texto. | Reclamos en el ranking, puntos injustos. | Rúbrica cerrada, salida validada, tope de bono, explicación visible (P5). |
| R4 | Iniciar sesión con Google requiere configuración extra y varias cuentas para probar grupos. | Retraso; demo con un solo usuario. | Configurarlo temprano; preparar 3+ cuentas de Google de prueba. |
| R5 | Alcance mayor al tiempo disponible. | Funcionalidades incompletas. | MVP cerrado y priorizado antes de codificar. |

## 9. ¿Cómo sabremos que el proyecto resuelve el problema? (propuesta)

En la demo en vivo debe poder mostrarse, de principio a fin:

1. Al menos 3 usuarios en un mismo grupo hacen predicciones (con y sin justificación) sobre un partido.
2. El partido termina (real o simulado) y **sin intervención manual** cada usuario recibe sus puntos base y su bono, con la explicación visible.
3. El ranking del torneo y el de la jornada se actualizan.
4. Se otorga al menos una insignia o racha por acierto.

## 10. Fuentes

- ENCODAT 2025, resultados sobre apuestas (reportado por Deadspin, 18-ago-2026): https://deadspin.com/es/mx/noticias-legales/encodat-2025-adolescentes-apuestan-mas-que-los-adultos-en-mexico/
- AMEXI, "Juego problemático alcanza a 249 mil personas que apuestan en México": https://amexi.com.mx/especiales/juego-problematico-apuestas-mexico/
- La Jornada, estudio de STP sobre apuestas en el Mundial 2026 (24-ago-2026): https://www.jornada.com.mx/noticia/2026/08/24/economia/apuestas-del-mundial-se-dispararon-43175-por-ciento-en-mexico-senala-firma-financiera
- Infobae, "Apuestas en línea en México: el crecimiento del mercado…" (9-jun-2026): https://www.infobae.com/america/inhouse/2026/06/09/apuestas-en-linea-en-mexico-el-crecimiento-del-mercado-abre-nuevas-alertas-sobre-regulacion-y-proteccion-al-consumidor/
- Focus Gaming News, estudio Jumio sobre apuestas deportivas en el Mundial 2026 (3-jun-2026): https://focusgn.com/latinoamerica/mexico-lidera-la-intencion-de-participacion-en-apuestas-deportivas-durante-el-mundial-2026
- ⚠️ Pendiente: enlazar el informe oficial de la ENCODAT 2025 (las notas reportan cifras ligeramente distintas para mujeres adolescentes; usar solo cifras del informe oficial al presentar).
- Descartado como evidencia: nota de El Imparcial (jun-2026) "4 de cada 10 jóvenes de 18–25 endeudados", sin estudio ni metodología.

## 11. Visión a futuro (fuera del alcance escolar; no cambia el MVP)

Jesús quiere continuar y publicar la app después de la materia. Ideas registradas para entonces:

- **Gamificación estilo FIFA:** carta de jugador por usuario con una media y atributos calculados de su desempeño (aciertos por tipo, calidad de análisis, rachas), con niveles visuales (bronce/plata/oro) que se ganan por desempeño. Supuesto de Jesús: el público de 18–25 que sigue el fútbol y apuesta suele jugar FIFA/EA FC, así que estas dinámicas le serían familiares y atractivas.
  - **Límite (P4):** nada de sobres, recompensas aleatorias ni nada comprable. Los sobres de Ultimate Team son una mecánica de azar que en algunos países se regula como apuesta; copiarla contradiría el propósito del proyecto.
- **Implicaciones para el MVP:** el modelo de datos no debe suponer una sola liga ni una sola temporada, y debe guardar las estadísticas por usuario que alimentarían la carta.
- **Antes de publicar habrá que revisar:** costo continuo de la API de datos y de la IA, licencia de uso comercial de los datos, uso de escudos y nombres de clubes (marcas registradas) y las políticas de Google Play sobre concursos y predicciones.
