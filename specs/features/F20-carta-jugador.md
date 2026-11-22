# F20 — Carta de jugador
> **Estado:** ✅ **Terminada** (2026-11-22, D110: cumple CA1–CA4 y Jesús la aprobó en su teléfono) · v1.1 (2026-11-22, detalle de la media y los atributos en hoja, pedido de Jesús en el guion de M6) · v1.0 (2026-11-21, D108) · pendiente de implementar · **Prioridad:** Must del rediseño (antes Could, D41, D42, D104) · **Módulo:** M6 Identidad · **Depende de:** F05, F06, F13, F18, F28 · **Pantallas:** S09 · **Decisiones:** D23, D40, D41, D42, D52, D101, P4, 00-project §11

## Decisiones (D108)
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 3 | ¿Qué periodo mide la carta? | **Histórica:** todas tus predicciones calificadas, de cualquier torneo (como la racha, D101). | Solo el torneo actual; se reinicia con cada torneo. | A llena la carta antes y es coherente con la racha. B da un nuevo comienzo cada torneo, pero deja la carta bloqueada las primeras jornadas de cada uno. |

## Objetivo
Una carta estilo FIFA con tu media y cuatro atributos calculados de cómo predices y analizas, con nivel bronce, plata u oro que solo se gana acertando (P4). Sin personalizar, sin sobres y sin nada comprable (D23, 00-project §11).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Atributos** (servidor, 40–99, `40 + redondeo(59 × tasa)`, sobre el periodo de la decisión 3): **PRE Precisión** = predicciones con puntos base > 0 ÷ predicciones calificadas. **PUN Puntería** = promedio de puntos base ÷ 350 (máximo de una predicción, R05). **ANA Análisis** = promedio del bono de las evaluaciones `EVALUADA` ÷ 100; sin ninguna, vacío ("—"). **CON Constancia** = mín(mejor racha de F13, 10) ÷ 10. | 03-data-model §4, R05, F13 |
| R2 | **Media** = redondeo del promedio de los atributos con valor. **Nivel:** `BRONCE` < 65 · `PLATA` 65–79 · `ORO` ≥ 80. | 00-project §11 |
| R3 | **Mínimo:** 5 predicciones calificadas. Antes, la carta sale bloqueada, sin media ni nivel, con "Te faltan n predicciones calificadas para tu carta." | B05 |
| R4 | **Simulados:** cuentan, marcados (R08, D40, igual que F13); la carta dice "Incluye partidos simulados" si alguno cuenta. | D40, D101 |
| R5 | **Servidor:** vista `mi_carta` (`security_invoker`, solo `auth.uid()`), siempre una fila: `calificadas`, `precision`, `punteria`, `analisis`, `constancia`, `media`, `nivel`, `incluye_simulados`. Se calcula en cada lectura, sin tablas precalculadas (como F13 R6). | D52 |
| R6 | **Permisos (nivel 3, se aprueban con esta spec):** `grant select` de `mi_carta` a `authenticated`, que lee con las RLS de `prediccion`, `calificacion` y `evaluacion_ia` (solo lo propio); `anon` sin acceso; sin `security definer`. | D14, D35 |
| R7 | **Carta** (componente nuevo, 05-ui U6: los metales solo en recompensas): rectángulo con radio 12 y el degradado del metal de su nivel (05-ui §2) dibujado con `react-native-svg` (ya instalado, sin librería nueva); el texto usa el color "texto encima" del metal. Arriba, media en Teko grande y nivel en texto (U5: el metal no va solo); en medio, `FotoUsuario`, nombre y escudo del equipo favorito (F18); abajo, los 4 atributos (abreviatura en `etiqueta` y número en `numero`). Bloqueada: `superficie2`, sin metal. | U5, U6 |
| R8 | **En S09** (F28 R2) como sección "Tu carta", con "Se calcula con todas tus predicciones calificadas. Toca la media o un atributo para ver qué es." Tocar la **media** o un **atributo** abre su **detalle en una hoja** (v1.1, `HojaModal`, como el de las insignias): valor grande sobre el metal, nombre, qué mide y cómo se calcula (fórmula de R1); para la media, los niveles de R2 y cuándo aparece (R3); para Análisis sin dato, por qué sale "—". | P5 |

## Flujo
**Servidor:** migración con `mi_carta` (R5) y su permiso (R6).

**App:** S09 pide `mi_carta` (Zod) y pinta la carta (R7–R8); la barra superior (F25) usa `media` y `nivel` de la misma consulta. Se vuelve a pedir al volver a la pestaña (como F13 R7).

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto con la forma de la carta. |
| Bloqueada | R3. |
| Error | Mensaje y "Reintentar" dentro de la sección; el resto de S09 sigue. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Con calificaciones y evaluaciones de prueba, `mi_carta` calcula cada atributo y la media según R1–R2; sin evaluaciones, `analisis` es vacío y la media usa los otros tres. | [prueba] pgTAP |
| CA2 | Con menos de 5 calificadas, `media` y `nivel` son vacíos; los límites de nivel (64/65 y 79/80) caen donde dice R2; cada usuario lee solo su carta y `anon` nada. | [prueba] pgTAP |
| CA3 | La carta muestra media, nivel en texto, nombre, escudo y los 4 atributos ("—" en ANA sin evaluaciones); bloqueada dice cuántas faltan; "Incluye partidos simulados" si aplica. | [prueba] jest |
| CA4 | Ver la carta en S09 antes y después de llegar a 5 calificadas (con simulados), en el teléfono y en un emulador de 320–360 dp. | [teléfono] |

## Fuera de alcance
Carta de otros usuarios (F19, M8), informs y cartas especiales (B04), personalización o diseños comprables (D23, M2 del backlog), historial de la media.
