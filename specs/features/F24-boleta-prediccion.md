# F24 — Boleta de predicción
> **Estado:** ✅ Aprobada v1.0 (2026-11-21, D105) · pendiente de implementar · **Prioridad:** Must del rediseño · **Módulo:** M5 Base visual · **Depende de:** F03, F04, F22 · **Pantallas:** S03 · **Decisiones:** D20, D21, D82, D91, D104, D105

## Decisiones (D105)
1. **Al abrir un partido que ya predije (antes del cierre):** **(A, recomendada)** se ve la **boleta**; el formulario solo con "Editar". **(B)** se ve el formulario, como hoy. A deja claro que ya está hecho y evita cambios por accidente.
2. **Vibración:** **(A, recomendada)** una vibración corta al guardar **y** otra distinta si falla. **(B)** solo al guardar. Necesita `expo-haptics` (nativa): entra en la build nueva de M5.
3. **Sin aviso flotante de éxito:** la boleta ya confirma lo que pasó; un aviso arriba repetiría lo mismo. Los errores siguen bajo el botón (F03).

## Objetivo
Que guardar una predicción se sienta terminado: en lugar de dejar el formulario abierto, S03 muestra una **boleta** con lo que predije y un botón para editarla.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **`BoletaPrediccion`** (tarjeta, 05-ui v2 U1): etiqueta "Tu predicción"; lo elegido en grande (`titulo2`): el marcador ("2 – 1" con los nombres cortos) o el resultado y el rango ("Gana América · 2 goles"); la justificación completa en `cuerpo` (o "Sin análisis"); "Guardada · [hora]" en `meta`. | F03, F04 |
| R2 | **Al guardar** con éxito: el formulario se cierra y aparece la boleta (con la vibración de éxito, decisión 2). | F03 Flujo 4 |
| R3 | **Al abrir** S03 con predicción propia y antes del cierre: la boleta (decisión 1). Sin predicción: el formulario, como hoy. | Decisión 1 |
| R4 | **"Editar predicción"** (`Boton` secundario con ícono `lapiz`) abre el formulario con lo guardado. En edición: "Actualizar" (F03), **"Cancelar"** (vuelve a la boleta sin guardar y descarta lo no guardado) y "Quitar predicción" (F03, decisión de D90, solo aquí). Quitarla deja el formulario vacío. | F03 |
| R5 | **Cerrado:** la boleta en solo lectura, sin "Editar", con "Predicciones cerradas" en el encabezado (F03 Flujo 6). Si el contador llega a 0 en edición, se descarta lo no guardado con el aviso de F03 y se muestra la boleta de lo último guardado. | F03 R1 |
| R6 | **Vibración** (decisión 2): `expo-haptics`, éxito al guardar y error al fallar; respeta el ajuste de vibración del sistema. Es la única dependencia nativa nueva de M5: entra en una sola development build al inicio del módulo y se vuelve a medir el tamaño contra D91. | D79, D91 |
| R7 | Sin cambios en el servidor: las reglas de F03 y F04 (cierre, una predicción por partido, 500 caracteres) siguen iguales. | D52 |

## Flujo
**App (S03):** abrir → ¿hay predicción y está abierto? → boleta (R3) · sin predicción → formulario. Guardar → boleta (R2). Editar → formulario → Actualizar (boleta) o Cancelar (boleta sin cambios).

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Guardando | El de F03 (`Boton` en `cargando`). |
| Error al guardar | El de F03, bajo el botón; el formulario sigue abierto con lo capturado (vibración de error). |
| Cerrado | R5. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Guardar una predicción muestra la boleta con el marcador o con resultado y rango, la justificación y la hora. | [prueba] jest |
| CA2 | Abrir un partido ya predicho y abierto muestra la boleta; uno sin predicción muestra el formulario. | [prueba] jest |
| CA3 | "Editar" abre el formulario con lo guardado; "Cancelar" vuelve a la boleta sin cambios; "Quitar" deja el formulario vacío. | [prueba] jest |
| CA4 | Cerrado: boleta sin "Editar"; si cierra durante la edición, se descarta lo no guardado y se ve la boleta. | [prueba] jest |
| CA5 | Se pide la vibración de éxito al guardar y la de error al fallar (simulacro de `expo-haptics`). | [prueba] jest |
| CA6 | En el teléfono: predecir, ver la boleta y sentir la vibración; editar, cancelar, actualizar y quitar. | [teléfono] |
| CA7 | La boleta se ve completa en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |
| CA8 | Tamaño de descarga de la build nueva medido y por debajo de 35 MB (D91). | [teléfono] |

## Fuera de alcance
Compartir la boleta (F15), aviso flotante de éxito (decisión 3), ver los puntos posibles de cada opción (F03 R9).
