# F28 — Perfil propio
> **Estado:** ✅ **Terminada** (2026-11-22, D110: cumple CA1–CA6 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-21, D108) · **Prioridad:** Must del rediseño · **Módulo:** M6 Identidad · **Depende de:** F01, F13, F14, F18, F20 · **Pantallas:** S09, S14 (nueva) · **Decisiones:** D23, D52, D75, D103, D104, F01 Q1/V3/V4

## Decisiones (D108)
| # | Pregunta | A (recomendada) | B | Consecuencia |
|---|---|---|---|---|
| 1 | ¿Se puede cambiar el nombre que ven los demás? | **Sí:** un nombre visible de 3–20 caracteres que reemplaza al de Google y ya no se sobrescribe al iniciar sesión. | No: siempre el nombre de Google. | A cambia F01 Q1 y abre `update (nombre)` de la fila propia (nivel 3); los rankings muestran apodos, lo común en apps de fútbol, y el nombre real deja de ser obligatorio en los grupos. B no toca permisos. |

## Objetivo
Que el perfil se sienta tuyo: foto, nombre y equipo arriba, y debajo tu carta, tu racha y tu Vitrina, en lugar de la pantalla de ajustes que quedó para la demo (D103).

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Encabezado de S09:** `FotoUsuario` (nuevo, `fotoPerfil` 72) con la foto de Google (`fotoUrl`, `expo-image`); sin foto o si falla, círculo `superficie2` con la inicial del nombre en Teko (mismo respaldo que `EscudoEquipo`, F22 R3, y que el ícono de grupo, D104). Nombre en `titulo1`. Debajo, el equipo favorito (escudo `escudoLista` + nombre corto) o "Elige tu equipo" → S12 (F18). | D104, F22 R3 |
| R2 | **Orden de S09:** encabezado · Carta (F20) · Racha (F13, sin cambios de reglas) · Vitrina (F14) · Ajustes: "Equipo favorito" (→ S12), "Nombre" (→ S14, decisión 1), Recordatorios (F11a), "Simulación" (solo `ADMIN`, D36) y "Cerrar sesión". Las secciones son independientes: una que falla no rompe las demás. | D103 |
| R3 | **S14 Cambiar nombre** (modal `/nombre`, tapa el menú como S12): `CampoTexto` con el nombre actual y contador de 20; "Guardar" deshabilitado si no cambió o no es válido en la app. Al guardar vuelve a S09 sin agregar historial (D78). Error del servidor bajo el campo. | Decisión 1 |
| R4 | **Nombre válido** (lo decide el servidor; la app solo adelanta el aviso): se recortan los espacios de los extremos y se juntan los repetidos; 3–20 caracteres; letras (con acentos y ñ), números, espacios, punto, guion y guion bajo. Si no cumple: `NOMBRE_INVALIDO` ("Usa de 3 a 20 letras o números."). | Decisión 1 |
| R5 | **Servidor:** `Usuario.nombreEditado` (falso al crear la cuenta). Cuando el usuario cambia su `nombre`, un disparador lo normaliza y valida (R4) y marca `nombreEditado`. La copia desde Google en cada inicio de sesión (F01 Q1) actualiza la foto siempre y el nombre solo si `nombreEditado` es falso. | F01 Q1 |
| R6 | **Permisos (nivel 3, se aprueban con esta spec):** `grant update (nombre)` de `usuario` a `authenticated`, sobre la política existente de la fila propia (F01 V3). `nombre_editado` no se puede escribir desde la API; solo lo cambia el disparador. `rol` sigue sin poder cambiarse (V4). | F01 V3, V4 |
| R7 | **Datos:** S09 lee una vez la fila propia de `usuario` (nombre, foto, equipo favorito con escudo y colores, rol, recordatorios) con Zod; la misma consulta la usa la barra superior (F25) con la misma caché. | D52, D54 |

## Flujo
**Servidor:** migración con `nombre_editado`, el disparador de R5 y el permiso de R6.

**App:** S09 pide el perfil (R7) y pinta R1–R2. "Nombre" abre S14 → Guardar → servidor → vuelve a S09; S09, la barra y los rankings toman el nombre nuevo al volver a pedirse.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Cargando | Esqueleto del encabezado (círculo y dos barras) y de cada sección. |
| Error del perfil | Mensaje y "Reintentar" en lugar del encabezado; las demás secciones siguen. |
| Error al guardar el nombre | Bajo el campo, como F03; el campo conserva lo escrito. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Cambiar el nombre propio a uno válido lo guarda normalizado y marca `nombreEditado`; uno inválido (2 o 21 caracteres, solo espacios, símbolos no permitidos) da `NOMBRE_INVALIDO`; nadie cambia el nombre de otro ni su propio `nombre_editado` o `rol`. | [prueba] pgTAP |
| CA2 | Con `nombreEditado`, un nuevo inicio de sesión actualiza la foto pero no el nombre; sin él, actualiza los dos. | [prueba] pgTAP |
| CA3 | S09 muestra la foto (o la inicial), el nombre, el equipo (o "Elige tu equipo") y las secciones en el orden de R2; "Simulación" solo con `ADMIN`. | [prueba] jest |
| CA4 | S14 deshabilita "Guardar" sin cambios o con un nombre inválido, guarda, regresa a S09 y muestra el error del servidor bajo el campo. | [prueba] jest |
| CA5 | Cambiar el nombre y verlo en S09, en la barra superior y en el ranking de un grupo desde otra cuenta. | [teléfono] |
| CA6 | S09 y S14 se ven completas en el teléfono y en un emulador de 320–360 dp (D75). | [teléfono] |

## Fuera de alcance
Subir una foto propia (almacenamiento, moderación y una librería nativa; D104), perfil de otros (F19, M8), eliminar cuenta (B18), títulos o carta personalizable (D23).
