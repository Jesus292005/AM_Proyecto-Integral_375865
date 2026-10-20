# 04 — Herramientas (fase de Diseño)

> **Estado:** ✅ Aprobado v1.2 (2026-10-19; v1.2 agrega la medición de tamaño y el tope de D79)
> **Última actualización:** 2026-10-19
> Base: specs 00–03 y `decisions.md`. Las herramientas se eligen por los requisitos ya definidos, no al revés.

---

## 1. Requisitos que deciden la elección

| # | Requisito | Viene de |
|---|---|---|
| T1 | Datos **relacionales** con sumas y agrupaciones (rankings por torneo/jornada, rachas, atributos de carta). | 03-data-model §4 |
| T2 | Inicio de sesión con Google. | D11 |
| T3 | **Tareas programadas** en el servidor: sincronizar partidos, detectar finales, calificar, evaluar con IA, mandar notificaciones — sin que nadie abra la app. | F02, F05, F06, F11 |
| T4 | Claves secretas solo en el servidor. | D14 |
| T5 | Reglas de visibilidad aplicadas en el servidor (predicciones ocultas hasta el inicio). | D35 |
| T6 | Notificaciones push en Android. | F11 (Must) |
| T7 | Presupuesto total < 600 MXN; 1 desarrollador; 8 semanas. | 00-project §7 |
| T8 | El docente valora la codificación: debe haber lógica de negocio propia, no solo configuración. | Contexto de la materia |

## 2. Backend y base de datos — opciones

| | **A. Supabase** | **B. Firebase** | **C. Backend propio (Node) + PostgreSQL** |
|---|---|---|---|
| Base de datos | PostgreSQL (relacional) ✅ T1 | Firestore (documentos). Rankings y sumas son incómodos; hay que duplicar datos ⚠️ | PostgreSQL ✅ |
| Google login | Incluido; la app usa el inicio de sesión nativo de Google y Supabase valida el token ✅ | Incluido ✅ | Lo programas tú (verificar el token de Google, sesiones) ⚠️ |
| Tareas programadas (T3) | `pg_cron` llama a funciones del servidor (Edge Functions, TypeScript) ✅ | Las funciones programadas **requieren el plan Blaze** (con tarjeta, pago por uso) ⚠️ | Un proceso con cron; los hospedajes gratis "se duermen" y el cron deja de correr ⚠️ |
| Visibilidad (T5) | Políticas de seguridad por fila (RLS) o funciones en el servidor ✅ | Reglas de seguridad; difícil con "comparte al menos un grupo" ⚠️ | Lo programas tú ✅ |
| Costo | Gratis | Gratis hasta usar funciones programadas | ~5 USD/mes de hospedaje que no se duerme |
| Código propio (T8) | Lógica de negocio en Edge Functions (sincronización, motor de puntos, IA, notificaciones) + SQL | Funciones | Todo |
| Tiempo de configuración | Bajo | Bajo | Alto (servidor, autenticación, despliegue) |
| Riesgo principal | El plan gratis **pausa el proyecto tras 1 semana sin actividad** | Plan de pago para lo esencial | Tiempo: es construir lo que A ya trae |

**Recomendación: A. Supabase.** Es la única que cumple T1, T3 y T7 a la vez. El código propio que pide la materia vive donde importa: el motor de puntos, la sincronización con la API, la evaluación con IA y las notificaciones.

**Mitigación del riesgo de pausa:** las tareas programadas corren a diario, lo que mantiene actividad; aun así, revisar el panel antes de la demo y verificar que el proyecto no se haya pausado en las semanas sin partidos.

**Consecuencia en el repo:** `backend/` (Node con `test-anthropic.ts`) se reemplaza por la estructura de Supabase (migraciones SQL + funciones).

## 3. App (React Native + Expo SDK 57)

| Necesidad | Propuesta | Por qué | Alternativa |
|---|---|---|---|
| Navegación | **Expo Router** | Las rutas de `02-navigation.md` se vuelven archivos directamente. | React Navigation (más código manual) |
| Datos del servidor | **TanStack Query** | Da por pantalla los estados cargando / error / datos / reintento que exige cada spec, y caché. | `useEffect` + estado manual (más errores) |
| Estado local | Estado de React / Context | La sesión es lo único global; una librería extra no se justifica. | Zustand si aparece la necesidad |
| Login con Google | `@react-native-google-signin/google-signin` + `signInWithIdToken` de Supabase | Inicio de sesión nativo de Android. | Navegador (OAuth web), peor experiencia |
| Notificaciones | `expo-notifications` + servicio de push de Expo (usa FCM) | Gratis; el servidor manda a los tokens guardados en `Dispositivo`. | FCM directo (más configuración) |
| QR | `expo-camera` (lectura) + `react-native-qrcode-svg` (generación) | Lectura de códigos integrada en la cámara de Expo. | — |
| Compartir | `Share` de React Native | Hoja nativa de Android, sin dependencias. | — |
| Compilación | **Development build** (EAS Build, plan gratis, o compilación local con Android Studio) | Google Sign-In nativo y push **no funcionan en Expo Go** (push remoto deshabilitado en Android desde SDK 53). | — |

## 4. Inteligencia artificial (F06)

| | Propuesta |
|---|---|
| Proveedor | Anthropic (ya hay clave, solo en el servidor). |
| Modelo | **Claude Haiku 4.5** (1 USD / 5 USD por millón de tokens de entrada / salida). Una evaluación (~2,000 tokens de entrada y ~500 de salida) cuesta ≈ 0.005 USD (≈ 8 centavos MXN). Si resulta inconsistente en las pruebas, Claude Sonnet 4.6 (~3 veces el costo). Se decide en la spec de F06 con pruebas reales. |
| Salida | Formato fijo (JSON) validado en el servidor antes de guardar; si no es válido, reintento y luego estado `ERROR` (el bono queda pendiente). |

## 5. Pruebas

| Qué | Cómo |
|---|---|
| Reglas de negocio (puntos, rangos, rachas, visibilidad, cierre de predicciones) | Pruebas unitarias **obligatorias** sobre funciones puras en TypeScript. |
| Funciones del servidor | Pruebas con datos de partidos reales de 2024 guardados como ejemplos. |
| Pantallas | Pruebas de componentes solo donde haya lógica (formulario de predicción); el resto, prueba manual de Jesús en su Android. |

## 6. Costo estimado

| Concepto | Costo |
|---|---|
| Supabase (plan gratis) | 0 |
| Expo / EAS (plan gratis) | 0 |
| API-Football, 1 mes Pro | ~325 MXN |
| Anthropic (créditos; decenas a cientos de evaluaciones en desarrollo y demo) | ~85 MXN (5 USD), si no hay saldo |
| **Total** | **~410 MXN** (< 600 ✅) |

## 7. Requisitos no funcionales (D52)

### App ligera
| Medida | Detalle |
|---|---|
| Imágenes remotas | Escudos y fotos se cargan desde URL con caché (`expo-image`); **no** se empaquetan en la app. |
| Dependencias | Cada librería nueva se justifica en la spec que la necesita; nada de librerías pesadas de animación o UI completas "por si acaso". |
| Formato de publicación | Android App Bundle (Google Play entrega a cada teléfono solo lo que necesita). |
| Medición | Se mide el tamaño del primer build (S2) y se fija un tope (P-20); se vuelve a medir antes de la demo. |
| Tope (D79) | **30 MB** de descarga desde Google Play en `arm64-v8a`. |

**Medición 1 (2026-10-19, T07)** — versión 1.0.0 (1), Expo SDK 57, sin librerías nativas propias todavía (solo Expo Router, fuentes y `expo-dev-client`).

| Artefacto | Tamaño | Nota |
|---|---|---|
| AAB de producción (EAS, build `44b6620b`) | 70.3 MB | Archivo que se sube a Google Play; no es lo que descarga el usuario. |
| **Descarga desde Google Play, `arm64-v8a`** | **23.8–24.0 MB** | `bundletool get-size total --dimensions=ABI` (1.18.3). Es el valor que cuenta: casi todos los teléfonos actuales son `arm64-v8a`. |
| Descarga, otras arquitecturas | 22.9–24.6 MB | `armeabi-v7a` 22.9–23.1 · `x86_64` 24.0–24.2 · `x86` 24.4–24.6. |
| APK de desarrollo (build `5be9d2b2`) | 258.9 MB | Incluye las 4 arquitecturas y el cliente de desarrollo; **no** representa la descarga. |

Cómo repetirla: `npx eas-cli@24.12.1 build -p android --profile production`, descargar el `.aab` y correr `java -jar bundletool-all-1.18.3.jar build-apks --bundle=<archivo>.aab --output=app.apks` y `java -jar bundletool-all-1.18.3.jar get-size total --apks=app.apks --dimensions=ABI`.

### App delgada (lógica en el servidor)
| Medida | Detalle |
|---|---|
| Reglas de negocio | Puntos, rangos de goles, cierre de predicciones, visibilidad, insignias y rankings se calculan **solo en el servidor**. La app nunca calcula puntos. |
| Configuración | Valores de puntos, catálogo de insignias y textos de reglas viven en la base de datos; cambiarlos no requiere actualizar la app. |
| Actualizaciones | Cambios de JavaScript/diseño por **EAS Update** (actualización por aire; Google Play lo permite para código JavaScript). Cambios nativos (nuevas librerías nativas, permisos) sí requieren nueva versión en la tienda. |

## 8. iOS (aprobado, D53)

| Hecho | Implicación |
|---|---|
| En México, Android ≈ 72% e iOS ≈ 28% de los teléfonos (StatCounter, sep-2026). | Dejar fuera iOS deja fuera a ~1 de cada 4 usuarios **cuando se publique**. |
| React Native + Expo son multiplataforma. | Casi todo el código sirve para iOS sin cambios si no se usan APIs exclusivas de Android. |
| Google Sign-In nativo y push requieren development build; en iPhone eso exige cuenta de Apple Developer (99 USD/año). | Fuera del presupuesto de la entrega. |
| No hay iPhone para probar. | Se entregaría sin validar: contra la definición de "terminado". |
| App Store exige, si se usa inicio de sesión con Google, ofrecer **otra opción con protecciones de privacidad** (p. ej. Sign in with Apple). | Trabajo extra al publicar en iOS. |

**Propuesta:** entrega solo Android (D12), pero **código multiplataforma** (sin APIs exclusivas de Android, sin rutas de archivos o permisos específicos) para que publicar en iOS sea agregar configuración, Sign in with Apple y pruebas, no reescribir.

## 9. TypeScript estricto (D54)

| Regla | Detalle |
|---|---|
| Compilador | `strict: true`, `noUncheckedIndexedAccess: true` en app y funciones. |
| `any` | Prohibido (lint en modo error). Para datos desconocidos se usa `unknown` + validación. |
| Tipos de la base de datos | Generados con la CLI de Supabase a partir del esquema; nunca escritos a mano. |
| Datos externos | Validados con **Zod** al entrar: respuestas de API-Football, salida JSON de la IA, cuerpo de las peticiones a funciones. Si no cumplen el esquema, se rechazan y se registra el error. |
| Rutas | Rutas tipadas de Expo Router (parámetros con tipo). |
| Estados | Uniones discriminadas (p. ej. `{ estado: "EVALUADA", puntosBono }` o `{ estado: "PENDIENTE" }`), sin banderas sueltas. |

## 10. Pendientes

Ninguno. Resuelto: P-20 (D79).
