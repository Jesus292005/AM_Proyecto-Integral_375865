# F04 — Justificación en texto
> **Estado:** ✅ **Terminada** (2026-11-02, D93: cumple CA1–CA7 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-02, D90) · **Prioridad:** Must · **Módulo:** M2 · **Depende de:** F03 · **Pantallas:** S03 · **Decisiones:** D08, D22, D35, D46, D52, D82

## Decisiones (D90)
5. En M4, quienes comparten grupo ven predicciones y justificaciones desde `cierrePredicciones` (03-data-model R04).

## Objetivo
Que el usuario explique por qué cree lo que predijo. Es opcional y solo puede sumar bono (D08, lo evalúa F06 en M3). En M2 nadie más que su autor la lee; mostrarla a quienes comparten grupo desde el cierre llega en M4.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | Opcional, **máximo 500 caracteres** después de quitar espacios al inicio y al final. Vacía o solo espacios = sin justificación (`null`). El servidor recorta y valida (restricción de la tabla, creada en el lote de F03, F03 R7); la app muestra el contador y no deja pasar del límite. | D52 |
| R2 | Es una columna de `prediccion`: solo existe junto con una predicción válida (R02). No se puede guardar justificación sin elegir algo en el formulario. | 03-data-model |
| R3 | Se edita y se quita con las mismas reglas de cierre que la predicción (F03 R1, mismo disparador). Quitar la predicción (F03) la quita. | D21, D82 |
| R4 | Oculta: en M2 solo la lee su autor (F03 R5, mismos permisos). En M4 la ven quienes comparten grupo desde `cierrePredicciones` (D90, 03-data-model R04). | D35 |
| R5 | La pantalla no muestra puntos: el texto de ayuda es "Opcional. Si tu análisis se parece a lo que pase, ganas bono aunque falles." | D08, D52 |
| R6 | Se guarda con el **mismo botón** que la predicción, en una sola escritura (F03 Flujo 3). Cambiar solo la justificación habilita "Actualizar". | — |
| R7 | Se escribe con el teclado del sistema (dictado incluido, D22); campo multilínea `CampoTexto` con texto `cuerpo`. | 05-ui §5 |

## Flujo
**App (S03)**
1. Debajo del formulario de F03, `Seccion` "Tu análisis" con `CampoTexto` multilínea, contador "n/500" y el texto de ayuda (R5).
2. Al guardar, la justificación viaja con la predicción (R6); el servidor recorta y guarda `null` si queda vacía.
3. Cerrado: la justificación propia se ve en solo lectura debajo de la predicción; si no hay, no se muestra la sección.

**Servidor:** sin cambios de esquema en este lote (F03 R7); solo pruebas.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Límite alcanzado | Contador en `fallo` con "500/500"; no admite más texto. |
| Error al guardar | El de F03; se conserva el texto escrito. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Se guarda una justificación de 500 caracteres y se rechaza una de 501. | [prueba] pgTAP |
| CA2 | Una justificación de solo espacios se guarda como `null`; los espacios al inicio y al final se recortan. | [prueba] pgTAP |
| CA3 | Ningún otro usuario (tampoco un administrador) lee la justificación ajena en M2. | [prueba] pgTAP |
| CA4 | Editar o quitar la justificación en o después del cierre falla con `PREDICCIONES_CERRADAS`. | [prueba] pgTAP |
| CA5 | El campo muestra el contador y no deja escribir más de 500 caracteres. | [prueba] jest |
| CA6 | Predicción y justificación se envían en una sola escritura; cambiar solo la justificación habilita "Actualizar". | [prueba] jest |
| CA7 | Escribir (o dictar) una justificación, guardar y reabrir la app: sigue ahí; después del cierre se ve en solo lectura. | [teléfono] |

## Fuera de alcance
Evaluación con IA y bono (F06), mostrar las de otros (M4, R04), comentarios (F16), moderación del contenido.
