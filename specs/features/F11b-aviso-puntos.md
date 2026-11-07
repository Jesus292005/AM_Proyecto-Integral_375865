# F11b — Notificación de puntos listos
> **Estado:** ✅ **Terminada** (2026-11-07, D96: cumple CA1–CA7 y Jesús la aprobó en su teléfono) · spec aprobada v1.0 (2026-11-05, D94) · **Prioridad:** Must · **Módulo:** M3 · **Depende de:** F11a (registro y envío), F05, F06 · **Pantallas:** S03 (destino) · **Decisiones:** D53, D69, D76, D78, D83, D85, D94

## Decisiones (D94)
3. El aviso de puntos **no** depende del ajuste "Recordatorios" de S09: llega a todo el que dio permiso y tiene dispositivo, en su propio canal de Android "Puntos de partidos", que se silencia desde los ajustes del teléfono.

## Objetivo
Avisar al usuario, sin que abra la app, que su partido ya tiene puntos: uno por partido y usuario, cuando ya están la base y el bono de la IA (o tras un tiempo máximo si la IA no ha terminado). Reutiliza el registro y el envío de F11a.

## Reglas
| ID | Regla | Origen |
|---|---|---|
| R1 | **Cuándo:** el aviso de (usuario, partido) está listo cuando su predicción tiene `Calificacion` y además: no tiene justificación, **o** su `EvaluacionIA` está `EVALUADA` o `ERROR`, **o** pasaron **20 min** desde `Partido.calificadoEn` (la IA sigue pendiente; con R8 de F06 un `ERROR` llega antes de ~10 min). | F06 R8 |
| R2 | **Selección** `avisos_puntos_pendientes(ahora)` (servidor): avisos listos (R1) de partidos calificados en las **últimas 24 h** (no avisa de partidos viejos al desplegar), de usuarios con al menos un dispositivo y sin `NotificacionEnviada` (`PUNTOS_LISTOS`, partido). Partidos cancelados no generan aviso (no hay calificación). No mira `recordatoriosActivos` (decisión 3). | D44 |
| R3 | **Uno por partido y usuario**, a todos sus dispositivos (no se agrupan: cada partido termina a su hora). La restricción única de `notificacion_enviada` (usuario, tipo, partido) ya lo garantiza. | 03-data-model |
| R4 | **Texto** (los números vienen del servidor): título "Tus puntos están listos"; cuerpo "Puebla 2-1 Querétaro: ganaste 250 puntos + 60 de bono." · sin justificación o con bono `ERROR`: "…: ganaste 250 puntos." · bono aún pendiente (R1 por tiempo): "…: ganaste 250 puntos; tu bono sigue en revisión." · 0 base y 0 bono: "…: esta vez no sumaste puntos." · 0 base con bono pendiente: "…: sin puntos base; tu bono sigue en revisión." · 0 base con bono: "…: sin puntos base + 80 de bono." El marcador es el de 90 min con nombres cortos. Un simulado lleva el título "Tus puntos están listos · Simulado" (R08, T60). | D43, D52 |
| R5 | **Envío:** el mismo de F11a R6 (`NotificacionEnviada` antes de enviar, bloques de 100, Zod sobre la respuesta, borra tokens `DeviceNotRegistered`). Ruta `/partido/:id`; la app ya la valida y navega (F11a R8, D76, D78); si el partido no existe, S03 muestra "Este partido no existe." + "Ir a Partidos" (02-navigation §4). | F11a R6, R8 |
| R6 | **Canal de Android** "Puntos de partidos", creado por la app junto al de recordatorios (solo JavaScript de `expo-notifications`, sin build nueva; D53). | F11a R9 |
| R7 | **Tarea programada cada minuto** con `pg_cron` + `pg_net` + Vault (D83), solo si `avisos_puntos_pendientes(now())` devuelve algo (patrón de D85). | D83, D85 |
| R8 | **Permisos (nivel 3, se aprueban con esta spec):** `avisos_puntos_pendientes` solo la ejecuta `service_role` (dice los puntos de cada usuario), como `recordatorios_pendientes`. No cambia ningún otro permiso. | D14 |

## Flujo
**Servidor**
1. Migración: `avisos_puntos_pendientes(ahora)` (R1, R2) y la tarea cada minuto (R7).
2. Función `avisos-puntos`: lee los listos, arma el texto (función pura, R4), escribe `notificacion_enviada` y envía con el cliente de Expo de F11a; resumen en el registro; 502 si hubo errores.

**App**
1. Crea el canal "Puntos de partidos" donde hoy crea el de recordatorios (R6).
2. Tocar el aviso abre S03 del partido (ya resuelto por F11a; solo se prueba la ruta).

## Estados de pantalla
No aplica (la notificación abre S03; sus estados son los de F03/F10).

## Criterios de aceptación
| ID | Criterio | Tipo |
|---|---|---|
| CA1 | `avisos_puntos_pendientes` devuelve: sin justificación, bono `EVALUADA`, bono `ERROR` y bono `PENDIENTE` con 20 min desde la calificación; y excluye: `PENDIENTE` con menos de 20 min, ya avisado, sin dispositivo, partido sin calificar, calificado hace más de 24 h y cancelado. | [prueba] pgTAP |
| CA2 | El texto cumple cada caso de R4. | [prueba] deno |
| CA3 | La función manda un aviso por (usuario, partido) a cada dispositivo y escribe `notificacion_enviada`; una segunda ejecución no manda nada; un `DeviceNotRegistered` borra el token. | [prueba] deno |
| CA4 | `authenticated` y `anon` no ejecutan `avisos_puntos_pendientes`. | [prueba] pgTAP |
| CA5 | La app crea el canal "Puntos de partidos" y un aviso con ruta `/partido/:id` navega a S03. | [prueba] jest |
| CA6 | Con la app cerrada, el administrador termina un simulado que otra cuenta predijo con justificación: llega un solo aviso "Tus puntos están listos" con base y bono; tocarlo abre S03 con el desglose. | [teléfono] |
| CA7 | Con "Recordatorios" apagado el aviso de puntos llega igual (decisión 3). | [teléfono] |

## Fuera de alcance
Agrupar varios partidos en un aviso, avisos de ranking o insignias (M4), recibos de entrega de Expo, preferencias por tipo de aviso dentro de la app (decisión 3).
