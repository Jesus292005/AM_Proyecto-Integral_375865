# F11a — Notificaciones: permiso, registro del dispositivo y recordatorio
> **Estado:** ✅ Aprobada v1.0 (2026-11-02, D90) · **Prioridad:** Must · **Módulo:** M2 · **Depende de:** F01, F02, F03 · **Pantallas:** S09 (ajuste), S03/S02 (destino) · **Decisiones:** D14, D32, D51, D52, D53, D69, D76, D79, D83, D85

## Decisiones (D90)
4. Recordatorio 1 h antes del cierre, solo a quien no ha predicho ese partido; un aviso por usuario y ejecución que agrupa los partidos que cierran en esa hora. Con un partido abre su S03; con varios, S02 de su jornada (02-navigation §4).

## Objetivo
Primera funcionalidad nativa visible (D69): pedir permiso de notificaciones con contexto, registrar el dispositivo y avisar antes del cierre de los partidos que el usuario aún no predice, sin que nadie abra la app. F11b (M3) reutiliza el registro y el envío.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | El permiso se pide **después de guardar una predicción**, solo si el sistema lo reporta como aún no preguntado y el usuario no eligió "Ahora no" en ese teléfono (marca guardada con `expo-secure-store`, que ya está en la app), con una explicación previa en la pantalla ("¿Te avisamos 1 h antes de que cierren los partidos que no has predicho?"). También desde el ajuste de S09. Nunca al abrir la app. | — |
| R2 | Con permiso concedido, la app obtiene el token de push de Expo y lo registra; lo vuelve a registrar en cada inicio de la app (el token puede cambiar). | D51 |
| R3 | Un token pertenece a un solo usuario: registrarlo con otra cuenta lo pasa a esa cuenta. **Cerrar sesión borra el token** del usuario que sale (complementa F01 §7). | F01 |
| R4 | Ajuste "Recordatorios" en S09 = `Usuario.recordatoriosActivos` (ya existe, F01 Q2), con un componente nuevo `Interruptor` (el `Switch` de React Native con colores de tokens: activo `acento`, inactivo `linea`) que se agrega a 05-ui §5. Si el permiso está negado, el ajuste lo dice y ofrece "Abrir ajustes" del sistema. | F01 Q2 |
| R5 | **Selección** (servidor, D90): partidos `PROGRAMADO`/`POSPUESTO` (incluye simulados) con `cierrePredicciones` en (ahora, ahora + 60 min]; usuarios con `recordatoriosActivos`, al menos un dispositivo, **sin** predicción en ese partido y sin `NotificacionEnviada` (`RECORDATORIO`, partido). | D21, D82 |
| R6 | **Envío:** un aviso por usuario y ejecución, a todos sus dispositivos, por el servicio de push de Expo. La `NotificacionEnviada` se escribe **antes** de enviar (nunca se manda dos veces; si el envío falla, ese recordatorio se pierde y se registra). Un token que Expo marca `DeviceNotRegistered` se borra. La respuesta de Expo se valida con Zod. | D54, 03-data-model |
| R7 | **Tarea programada** cada 15 min con `pg_cron` + `pg_net` y los secretos de Vault de D83; solo llama a la función si hay pendientes (patrón de D85). Por la frecuencia, el aviso llega entre 45 y 60 min antes del cierre. | D83, D85 |
| R8 | Texto: título "Cierra en menos de 1 h"; cuerpo "América vs Pumas: aún no lo predices." o "América vs Pumas y 2 partidos más: aún no los predices." La notificación lleva la ruta destino (`/partido/:id` o `/partidos?jornada=n`); la app la valida con Zod y navega con `router.navigate` (D78). Abre en la pestaña Inicio (D76); sin sesión, pasa por S01 y continúa (F01 CA8). | D76, D78 |
| R9 | Canal de Android "Recordatorios de partidos". La app no usa APIs exclusivas de Android fuera de lo que `expo-notifications` resuelve (D53). La API se consulta en la documentación de SDK 57 (`App/AGENTS.md`). | D53 |
| R10 | **Permisos (nivel 3, se aprueban con esta spec):** `dispositivo` con RLS: `authenticated` lee y borra solo sus filas; el registro va por `registrar_dispositivo(token)`, `security definer` con `search_path` vacío, que asigna el token a `auth.uid()` (R3). `notificacion_enviada` cerrada a `authenticated` y `anon`; solo `service_role`. `recordatorios_pendientes(ahora)` (dice quién no ha predicho) la ejecuta **solo** `service_role`, como `partidos_pendientes_de_final`. | D14 |
| R11 | `google-services.json` (FCM) **no** se versiona: se entrega a EAS como variable de archivo y `app.config.ts` lo toma de ahí. | D14 |

## Flujo
**Servidor**
1. Migración: `dispositivo` (token único), `notificacion_enviada` (único por usuario, tipo, partido), `registrar_dispositivo`, `recordatorios_pendientes(ahora)` (R5) y la tarea cada 15 min (R7).
2. Función `recordatorios`: lee los pendientes, agrupa por usuario, escribe `notificacion_enviada`, envía a Expo en bloques de hasta 100 mensajes, borra tokens no registrados y escribe en el registro de la función cuántos envió y cuántos fallaron.

**App**
1. Tras guardar una predicción (F03) con permiso sin preguntar (R1): explicación (R1) → "Sí, avísame" pide el permiso del sistema / "Ahora no" no vuelve a preguntar solo.
2. Con permiso: crea el canal (R9), obtiene el token y llama a `registrar_dispositivo`; lo repite al abrir la app con sesión.
3. S09: ajuste "Recordatorios" (sí/no) + estado del permiso (R4).
4. Tocar la notificación (app abierta, en segundo plano o cerrada) navega a la ruta que trae (R8).
5. Cerrar sesión: borra el token propio antes de cerrar la sesión de Supabase.

## Estados de pantalla
| Estado | Qué se ve |
|---|---|
| Permiso negado (S09) | Ajuste deshabilitado + "Las notificaciones están desactivadas para la app." + "Abrir ajustes". |
| Error al guardar el ajuste | El ajuste vuelve a su valor + mensaje "No se pudo guardar." |
| Registro fallido | Silencioso para el usuario; se reintenta en el siguiente inicio de la app. |

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `recordatorios_pendientes` devuelve al usuario sin predicción con un partido que cierra en ≤ 60 min, y excluye: con predicción, recordatorios apagados, sin dispositivo, ya notificado, cancelado, cierre pasado y cierre a más de 60 min. | [prueba] pgTAP |
| CA2 | Un usuario no lee ni borra dispositivos ajenos; `registrar_dispositivo` pasa un token existente a quien lo registra; `authenticated` no accede a `notificacion_enviada` ni ejecuta `recordatorios_pendientes`; `anon` no accede a nada. | [prueba] pgTAP |
| CA3 | La función agrupa en un aviso por usuario (texto de R8 con 1 y con varios partidos), lo manda a cada dispositivo y escribe `notificacion_enviada`; una segunda ejecución no manda nada. | [prueba] deno |
| CA4 | Un ticket `DeviceNotRegistered` borra ese token; una respuesta de Expo con forma inválida se registra como error sin reintentar. | [prueba] deno |
| CA5 | La app pide el permiso solo tras guardar una predicción, con la explicación previa y si el sistema no lo ha preguntado; con permiso registra el token; tras "Ahora no" (marca guardada) no vuelve a preguntar sola. | [prueba] jest |
| CA6 | Cerrar sesión borra el token propio. | [prueba] jest |
| CA7 | Una notificación con ruta válida navega a ella; una con datos inválidos se ignora. | [prueba] jest |
| CA8 | Con un simulado a 60 min sin predecir, llega el recordatorio entre 45 y 60 min antes del cierre; tocarlo abre su S03. Con la app cerrada, también. | [teléfono] |
| CA9 | Con el ajuste apagado o habiendo predicho, no llega el recordatorio; con el permiso negado, S09 lo indica y "Abrir ajustes" abre los del sistema. | [teléfono] |

## Fuera de alcance
Aviso de puntos listos (F11b, M3), recibos de entrega de Expo (solo se revisan los tickets), horario silencioso, notificaciones de grupos, elegir la anticipación del recordatorio.
