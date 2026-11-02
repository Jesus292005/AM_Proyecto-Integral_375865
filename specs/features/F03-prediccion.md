# F03 — Crear / editar predicción
> **Estado:** Borrador · **Prioridad:** Must · **Módulo:** M2 · **Depende de:** F01, F02 · **Pantallas:** S03, S02 (indicador) · **Decisiones:** D06, D19, D20, D21, D44, D46, D48, D52, D54, D68, D72, D78, D82

## Decisiones para Jesús
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 1 | ¿Se puede **quitar** una predicción antes del cierre? | Sí: botón secundario "Quitar predicción" con confirmación; borra también la justificación (F04). | No: solo se edita; una vez guardada, el partido queda predicho. | A abre `delete` de la fila propia antes del cierre (R6). Con B, quien se arrepiente no puede dejar el partido sin predecir. |

## Objetivo
Que el usuario elija, antes del cierre, qué cree que pasará en un partido: resultado y/o rango de goles, o marcador exacto. Una sola predicción por partido (D20), editable hasta `Partido.cierrePredicciones` (D21, D82), con el cierre aplicado por el servidor.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | Se crea, edita o quita solo si la hora del **servidor** (`now()` de la BD) es anterior a `Partido.cierrePredicciones` **y** el partido está `PROGRAMADO` o `POSPUESTO`. Un partido `EN_JUEGO`, `TERMINADO` o `CANCELADO` nunca acepta cambios aunque el cierre no haya pasado. | D21, D44, D46, D82; precisa R03 |
| R2 | Dos formas, excluyentes: **(a)** resultado (`LOCAL`/`EMPATE`/`VISITANTE`) y/o rango de goles (`0–1`, `2`, `3`, `4 o más`), combinables (solo suman, D06); **(b)** marcador exacto, 0–10 por equipo, ambos números. | D19, D48, D72; R02 |
| R3 | La app guarda lo que el usuario eligió y no deduce ni calcula nada. El resultado y el rango que se desprenden de un marcador los deduce F05 al calificar. | D52 |
| R4 | Guardar = crear o reemplazar la predicción del par (usuario, partido). `usuario_id` lo pone el servidor (`auth.uid()`), nunca la app; `creadaEn`/`actualizadaEn` también. No se puede cambiar `usuario_id` ni `partido_id` de una predicción existente. | D20; R01 |
| R5 | Visibilidad en M2: cada usuario lee **solo** sus predicciones (el administrador tampoco lee las ajenas). Mostrar las de otros (R04) llega con los grupos en M4. | D35 |
| R6 | **Permisos (nivel 3, se aprueban con esta spec):** tabla `prediccion` con RLS; `authenticated` puede `select`, `insert`, `update` (y `delete` si la decisión 1 = A) **solo de filas propias**; un disparador `before insert or update or delete` aplica R1 y responde con un error identificable (`PREDICCIONES_CERRADAS`) que la app distingue de una falla; `anon` sin acceso; `service_role` completo (F05, F06). El borrado en cascada al eliminar una cuenta (`auth.users`) no pasa por la regla de cierre. | D14, D35 |
| R7 | La migración crea la tabla **completa** de 03-data-model, incluida `justificacion` con su límite (F04 R1), para que el lote de F04 no toque SQL. | Lotes S5 |
| R8 | "Cierra en" se calcula con el reloj del teléfono contra `cierrePredicciones` y es solo informativo: si el teléfono va adelantado o atrasado, decide el servidor (R1). Más de 24 h: fecha y hora del cierre (`meta`); menos: contador `hh:mm:ss` (`titulo2`). | 05-ui §5 |
| R9 | El formulario no muestra los puntos de cada opción en M2: los valores viven en el servidor (04-tech-stack §7) y su tabla la crea F05. | D52 |

## Flujo
**Servidor**
1. `insert … on conflict (usuario_id, partido_id) do update` sobre `prediccion` (R4). El disparador valida R1; las restricciones de la tabla validan R2 (R02, marcador 0–10, marcador completo).
2. Quitar (si la decisión 1 = A): `delete` de la fila propia, validado por el mismo disparador.

**App (S03, `/partido/:partidoId`)**
1. Carga en paralelo el partido (equipos con nombre y colores, `inicio`, `cierrePredicciones`, `estado`, `esSimulado`) y mi predicción.
2. **Abierto:** `EncabezadoPartido` "por jugar" (D68) + "Cierra en". Formulario con `PestanasTexto`: **"Resultado y goles"** (3 opciones de resultado y 4 de rango, cada grupo se puede dejar sin elegir; componente nuevo `Opciones`: fila de botones `secundario`, la elegida en `superficie2` con borde `acento` y check, que se agrega a 05-ui §5) y **"Marcador exacto"** (`SelectorMarcador`, D72). Si ya hay predicción, el formulario la muestra y abre en su pestaña.
3. "Guardar predicción" (o "Actualizar" si ya existe) se habilita cuando hay una elección válida (R2) distinta de lo guardado. Se guarda **solo la pestaña activa**: guardar el marcador borra resultado y rango, y al revés.
4. Al guardar: texto `meta` "Predicción guardada · [hora]"; el formulario sigue editable.
5. (decisión 1 = A) "Quitar predicción" → confirmación → borra y el formulario queda vacío.
6. **Cerrado** (cierre pasado o estado no editable): `EncabezadoPartido` "Predicciones cerradas"; mi predicción en solo lectura o "No predijiste este partido". Si el contador llega a 0 con la pantalla abierta, pasa a cerrado y descarta lo no guardado con el aviso "Se cerraron las predicciones".
7. **S02:** cada tarjeta con predicción propia muestra el indicador "Predicho" (ícono check + texto, U5) en el espacio que dejó F02.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto del encabezado y del formulario (05-ui §6). |
| Error al cargar / sin conexión sin datos previos | Mensaje + "Reintentar" (05-ui §6). |
| Sin conexión con datos previos | Franja "Sin conexión · datos de [hora]"; el formulario se usa y guardar muestra el error al guardar. |
| Guardando | `Boton` en `cargando`; el formulario no cambia. |
| Error al guardar (red o servidor) | Mensaje bajo el botón ("No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."); se conserva lo capturado. |
| Cerrado al intentar guardar (`PREDICCIONES_CERRADAS`) | La pantalla pasa a cerrado con el mensaje "El partido ya cerró; tu cambio no se guardó." y muestra lo último guardado. |
| Partido no encontrado | "Este partido no existe." + botón "Ir a Partidos". |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Antes del cierre se guardan las 4 formas válidas: solo resultado, solo rango, resultado + rango, marcador. | [prueba] pgTAP |
| CA2 | Se rechazan: predicción vacía, marcador junto con resultado o rango, marcador con un solo número, marcador fuera de 0–10. | [prueba] pgTAP |
| CA3 | Guardar dos veces el mismo partido deja **una** predicción con lo último guardado. | [prueba] pgTAP |
| CA4 | Crear, editar o quitar en o después de `cierrePredicciones` falla con `PREDICCIONES_CERRADAS`; igual con un partido `EN_JUEGO`, `TERMINADO` o `CANCELADO` aunque el cierre no haya pasado. Eliminar una cuenta con predicciones cerradas sí las borra. | [prueba] pgTAP |
| CA5 | Un partido pospuesto antes del cierre acepta cambios hasta su nuevo cierre; uno cuyo cierre no se movió (pospuesto después del inicio, D46) sigue cerrado. | [prueba] pgTAP |
| CA6 | Un usuario no lee, crea, modifica ni quita predicciones de otro (tampoco con `usuario_id` ajeno ni siendo administrador); nadie cambia el `partido_id` de una predicción; `anon` no tiene acceso. | [prueba] pgTAP |
| CA7 | El formulario guarda solo la pestaña activa, deshabilita "Guardar" sin elección válida o sin cambios, y el selector va de 0 a 10. | [prueba] jest |
| CA8 | Ante `PREDICCIONES_CERRADAS` la pantalla pasa a cerrado con su mensaje; ante un error de red conserva lo capturado. | [prueba] jest |
| CA9 | S02 muestra "Predicho" solo en los partidos con predicción propia. | [prueba] jest |
| CA10 | Predecir un partido simulado, cerrar y reabrir la app: la predicción sigue; editarla y (decisión 1 = A) quitarla. | [teléfono] |
| CA11 | Con S03 abierta, al llegar el cierre el formulario se bloquea; guardar después muestra el mensaje de cerrado. | [teléfono] |
| CA12 | S03 se ve completa en el teléfono y en un emulador de 320–360 dp (05-ui A4), incluido el marcador. | [teléfono] |

## Fuera de alcance
Justificación (F04), ver predicciones de otros (M4, R04), puntos y desglose (F05, F10), previa del partido (F21), puntos de cada opción en el formulario (R9).
