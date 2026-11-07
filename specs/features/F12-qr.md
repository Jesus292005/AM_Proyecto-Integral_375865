# F12 — Unirse a un grupo escaneando QR
> **Estado:** ✅ Aprobada v1.2 (2026-11-07, fix del guion: R6 pide el permiso al entrar y al volver de Ajustes) · v1.1 (2026-11-07, T72: la unión automática solo con una lectura de S07, R4) · v1.0 (2026-11-07, D97) · **Prioridad:** Must (D88) · **Módulo:** M4 · **Depende de:** F07 · **Pantallas:** S07, S06 (botón y llegada desde el QR), S08 (imagen del QR) · **Decisiones:** D37, D51, D53, D54, D76, D78, D88, D91

## Decisiones
Ninguna propia; aprobada con las de M4 (D97).

## Objetivo
Invitar mostrando un QR en S08 y unirse escaneándolo con la cámara dentro de la app (D37), sin escribir el código. Reutiliza el código y el camino de unirse de F07: F12 no agrega SQL ni lógica de grupos.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Contenido del QR:** solo el código de invitación en su forma canónica, texto plano `ABCD-EFGH` (F07 R2). Sin URL ni enlaces profundos. | D37 |
| R2 | **Generar (S08):** `react-native-qrcode-svg` con el código que devuelve el servidor, en la sección "Invitar" de F07, junto al código escrito. Módulos en `fondo` sobre fondo `texto` (oscuro sobre claro: los lectores no siempre leen QR invertidos), con margen de 4 módulos y lado de 200 dp o el ancho disponible si es menor (D75). | D51, 05-ui §2 |
| R3 | **Leer (S07):** `CameraView` de `expo-camera` con `barcodeTypes: ['qr']`. Cada lectura pasa por el **mismo** `esquemaCodigoInvitacion` (Zod) de F07, que normaliza (mayúsculas, sin espacios ni guion) y valida el formato. | D51, D54, F07 R4 |
| R4 | **Código válido:** se deja de leer al primero (una bandera evita que las lecturas siguientes hagan algo) y S07 registra la lectura en memoria (`lecturaQR`) y regresa a S06 con `router.dismissTo('/grupos/unirse', { codigo, lectura })`. S06 se une **una vez por lectura** automáticamente con el gancho `useUnirseAGrupo` de F07 y sigue su flujo (S08 en la pestaña Grupos, o el error de F07 con el código en el campo). Un enlace externo con esos parámetros (la app tiene `scheme`) no pasa por S07: solo llena el campo (D37). | D78, F07 R4, R11 |
| R5 | **QR ajeno** (URL, texto, otro formato): franja `superficie2` con "Este QR no es una invitación de Campeón de Sillón." y la cámara sigue leyendo; el mismo contenido no vuelve a mostrar el aviso hasta pasados 3 s. Nunca se abre un enlace ni se ejecuta nada del QR. | D37 |
| R6 | **Permiso de cámara:** cada vez que se entra a S07 sin permiso, se pide (texto del permiso de T31); también tras "Solo esta vez", cuando Android ya lo quitó. Negado y se puede volver a pedir: explicación + "Permitir cámara" + "Escribir el código". Negado sin poder volver a pedirlo: explicación + "Abrir ajustes" (`Linking.openSettings`) + "Escribir el código"; al volver de Ajustes se pide otra vez (con "Preguntar siempre" aparece el diálogo; si sigue bloqueado, el sistema responde sin mostrar nada). "Escribir el código" regresa a S06. Al volver a la app por otra razón solo se revisa el permiso (el diálogo saca a la app de primer plano: pedirlo ahí lo repetiría en bucle). | D53 |
| R7 | **Navegación:** S07 tapa el menú (D76); "← Volver" regresa a S06 sin código. | D76 |
| R8 | **Sin dependencias nativas nuevas:** `expo-camera`, `react-native-svg` y `react-native-qrcode-svg` ya están en la development build de T32 (D88). Si al implementar falta alguna, es nivel 3 (otra build y medición contra D91). | D88, D91 |
| R9 | **Multiplataforma:** solo APIs de `expo-camera` y React Native, sin nada exclusivo de Android. | D53 |

## Flujo
**App**
1. S08 "Invitar": código escrito (F07) + QR (R2) + "Muéstralo para que lo escaneen desde Unirse a grupo." en `meta`.
2. S06 → "Escanear QR" → S07 (R6). Con permiso: cámara a pantalla completa con un recuadro guía (línea `acento`, radio pequeño) y el texto "Apunta al QR del grupo".
3. Lectura → R3 → R4 o R5.

**Servidor:** sin cambios (F07 `unirse_grupo`).

## Estados de pantalla
| Pantalla | Estado | Qué se ve |
|---|---|---|
| S07 | Revisando el permiso | Fondo `fondo` sin cámara (sin indicador a pantalla completa, 05-ui §6). |
| S07 | Permiso negado | R6: "Necesitamos la cámara para leer el QR. También puedes escribir el código." |
| S07 | Cámara no disponible (error al iniciar) | "No se pudo abrir la cámara." + "Escribir el código". |
| S06 | Uniéndose desde el QR | El código en el campo y `Boton` "Unirse" en `cargando`. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | Leer `ABCD-EFGH`, `abcdefgh` o ` ABCD EFGH ` regresa una sola vez a S06 con el código canónico aunque la cámara entregue la lectura 3 veces seguidas. | [prueba] jest |
| CA2 | Una URL, un texto cualquiera, un código de 9 caracteres o con `O`/`1` muestran el aviso de R5, no navegan y no llaman al servidor. | [prueba] jest |
| CA3 | Permiso concedido muestra la cámara; negado con nueva oportunidad muestra "Permitir cámara" y "Escribir el código"; negado sin nueva oportunidad muestra "Abrir ajustes"; volver a la app vuelve a revisar el permiso. | [prueba] jest |
| CA4 | S06 con una lectura de S07 llama a `unirse_grupo` una sola vez y sigue el flujo de F07; con el código de un enlace externo (sin lectura de S07), solo llena el campo. | [prueba] jest |
| CA5 | El QR de S08 contiene exactamente el código canónico del grupo. | [prueba] jest |
| CA6 | Con dos teléfonos (o el QR de S08 en otra pantalla): la segunda cuenta escanea desde S06 y en ≤ 3 s queda dentro del grupo con S08 abierta en la pestaña Grupos. | [teléfono] |
| CA7 | Negar el permiso muestra la explicación y "Escribir el código" funciona; quitarlo en Ajustes y volver muestra "Abrir ajustes". | [teléfono] |
| CA8 | Escanear un QR que no es de la app (p. ej. el de una página web) muestra el aviso y no abre nada. | [teléfono] |

## Fuera de alcance
Enlaces profundos o abrir la app desde la cámara del sistema (D37), compartir la imagen del QR (F15), leer QR desde una foto de la galería, linterna o zoom.
