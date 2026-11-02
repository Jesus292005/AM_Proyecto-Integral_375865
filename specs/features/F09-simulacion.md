# F09 — Modo de partidos simulados
> **Estado:** ✅ Aprobada v1.0 (2026-11-02, D90) · **Prioridad:** Must · **Módulo:** M2 · **Depende de:** F02 (y F03 para predecir los simulados) · **Pantallas:** S10, S09 (acceso), S02 y S03 (etiqueta) · **Decisiones:** D15, D36, D40, D43, D52, D84, D85

## Decisiones (D90)
2. Los simulados los ven todos los usuarios autenticados, con la etiqueta "Simulado" en S02 y S03.
3. Al terminar, un simulado lleva siempre el marcador real de 90 min del partido de origen, con sus estadísticas y eventos.

## Objetivo
Que el administrador "juegue" un partido real ya terminado como si fuera de hoy: los usuarios lo predicen (F03, F04), el administrador cierra y termina el partido cuando quiere, y la calificación de M3 corre igual que con uno real (D15, D36, D40). Es la forma de probar F05/F06 y de hacer la demo sin esperar partidos.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | Solo cuentas `ADMIN`: S09 muestra el acceso a S10 solo si mi `rol` es `ADMIN`, y **el servidor** verifica el rol en cada operación (ocultar el botón no basta). | D36 |
| R2 | **Origen válido:** partido real (`esSimulado = false`), `TERMINADO` y con datos listos (`listoParaCalificarEn` lleno, D84). Los datos de 2024 se bajan con P4 forzado (D85); hacerlo en M2 con el plan gratis (T39, ~20 consultas) espera la aprobación de Jesús, porque D85 lo preveía con el plan Pro. | D84, D85 |
| R3 | **Crear:** nuevo `Partido` con `esSimulado = true`, `partidoOrigenId`, sin `proveedorId`, los mismos equipos, en el **torneo actual** y su **jornada actual** (`jornada_actual`), `inicio = cierrePredicciones = ahora + N min` (N = 10, 30 o 60; por defecto 30), `PROGRAMADO`, sin marcador. Cuenta en el ranking de esa jornada (D40); para que la jornada siga describiendo a sus partidos, `fechaFin` se amplía hasta el nuevo `inicio` y `estaCerrada` vuelve a `false` (F05 la cierra al calificarlo). Con los datos de 2024 la jornada actual es la última del torneo. | D40, D82, D86 |
| R4 | **Iniciar ahora** (solo `PROGRAMADO`): `inicio = cierrePredicciones = ahora`, estado `EN_JUEGO`. Cierra las predicciones al instante (F03 R1). | D21 |
| R5 | **Terminar** (solo con el cierre ya pasado y estado `PROGRAMADO` o `EN_JUEGO`): copia del origen, en una sola transacción, el marcador de 90 min y el de medio tiempo, las estadísticas y los eventos; deja `TERMINADO` y `listoParaCalificarEn = ahora`. F05 lo califica como a uno real. No se puede terminar dos veces. | D43, D84 |
| R6 | Todo lo que sale de un simulado queda marcado: el partido por `esSimulado`; calificaciones e insignias en M3/M4 (R08). | D40 |
| R7 | La sincronización no toca simulados: P2 identifica por `proveedorId` y P3/P4 excluyen `esSimulado` (ya así en F02). | F02 R1, D85 |
| R8 | Los simulados no se borran en el MVP: sus predicciones y puntos son la evidencia de la demo; se excluyen por la marca cuando haga falta (D40). | D40 |
| R9 | **Permisos (nivel 3, se aprueban con esta spec):** tres funciones `simulacion_crear(origen, minutos)`, `simulacion_iniciar(partido)` y `simulacion_terminar(partido)`, `security definer` con `search_path` vacío, que verifican `rol = 'ADMIN'` de `auth.uid()` y si no responden `SOLO_ADMIN`. Ejecutables solo por `authenticated`; `anon` sin acceso. No se abre `insert`/`update` de `partido` a nadie. | D14, D36 |

## Flujo
**Servidor:** las tres funciones de R9; cada una valida sus precondiciones (R2–R5) y responde con un error identificable (`ORIGEN_INVALIDO`, `ESTADO_INVALIDO`, `AUN_NO_CIERRA`, `SIN_TORNEO_ACTUAL`).

**App**
1. S09: el enlace "Simulación" solo aparece para `ADMIN` (hoy se ve siempre en la pantalla provisional).
2. S10, sección **"En curso"**: simulados no terminados (equipos, estado, "Cierra en") con "Iniciar ahora" y "Terminar" (con confirmación); debajo, los últimos 5 terminados con su marcador.
3. S10, sección **"Nuevo"**: lista de orígenes válidos (R2) ordenados por fecha, con su marcador; elegir minutos (10 / 30 / 60) con `PestanasTexto` y "Crear". El nuevo aparece en "En curso" y en S02.
4. S02 y S03 muestran la etiqueta "Simulado" (texto `etiqueta`, U5) en los partidos simulados.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando / error / sin conexión | Los de 05-ui §6 para las dos secciones. |
| "En curso" vacío | "No hay partidos simulados en curso." |
| Sin orígenes | "No hay partidos terminados con datos. Fuerza P4 de algunos partidos de 2024 (D85)." |
| Sin permiso (abierta por URL sin ser `ADMIN`) | "Solo administradores." + "Volver". |
| Acción en curso | El botón de esa fila en `cargando`; las demás acciones deshabilitadas. |
| Error de una acción | Mensaje en la fila según el código (p. ej. "Todavía no cierra; usa Iniciar ahora."). |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Crear deja un partido simulado con los equipos y el origen correctos, en el torneo y la jornada actuales, con `inicio = cierre = ahora + N`, `PROGRAMADO`, sin proveedor ni marcador. | [prueba] pgTAP |
| CA2 | Un usuario que no es `ADMIN` no puede crear, iniciar ni terminar (`SOLO_ADMIN`); `anon` no puede ejecutar las funciones. | [prueba] pgTAP |
| CA3 | Se rechaza como origen un partido simulado, uno no terminado y uno sin datos listos. | [prueba] pgTAP |
| CA4 | Después de "Iniciar ahora", guardar una predicción de ese partido falla con `PREDICCIONES_CERRADAS`. | [prueba] pgTAP |
| CA5 | Terminar copia marcador de 90 min, medio tiempo, estadísticas y eventos del origen y deja el partido `TERMINADO` y listo para calificar; terminar antes del cierre o dos veces falla. | [prueba] pgTAP |
| CA6 | `partidos_pendientes_de_final` nunca devuelve un simulado. | [prueba] pgTAP |
| CA7 | S09 muestra el acceso a S10 solo a `ADMIN`; S10 abierta por un usuario muestra "Solo administradores". | [prueba] jest |
| CA8 | S02 y S03 muestran "Simulado" solo en partidos simulados. | [prueba] jest |
| CA9 | El administrador crea un simulado a 10 min; otra cuenta lo ve en S02 y lo predice; "Iniciar ahora" bloquea las predicciones; "Terminar" muestra en S02 el marcador del origen. | [teléfono] |
| CA10 | Una cuenta sin rol `ADMIN` no ve el acceso a S10. | [teléfono] |

## Fuera de alcance
Calificar el simulado (F05, M3), cancelar o posponer simulados, borrar simulados (R8), elegir el marcador (D90), grupo y cuentas de demo (se crean en M4 con F07, D40).
