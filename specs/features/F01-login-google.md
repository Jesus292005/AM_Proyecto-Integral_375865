# F01 — Inicio de sesión con Google y perfil básico

> **Estado:** ✅ Aprobada v1.0 (2026-10-04, D55)
> **Prioridad:** Must · **Semana:** S2 · **Depende de:** — · **Pantallas:** S01, S09 (parcial)
> **Decisiones:** D11, D14, D50, D51, D53, D54

## 1. Objetivo
Identificar a cada usuario con su cuenta de Google para que sus predicciones, grupos, puntos e insignias le pertenezcan y se conserven entre sesiones y dispositivos.

## 2. Actor
Aficionado con teléfono Android y cuenta de Google. Administrador (Jesús): mismo flujo; el rol se asigna aparte (Q4).

## 3. Precondiciones
- App instalada como development build (el login nativo de Google no funciona en Expo Go).
- Proyecto de Supabase con el proveedor Google configurado; credenciales OAuth de Android registradas (huella SHA-1 del certificado con el que se firma la app).

## 4. Datos de entrada
| Dato | Origen | Notas |
|---|---|---|
| Token de identidad (ID token) | Selector nativo de cuentas de Google | La app **no** envía nombre ni correo por su cuenta: el servidor los toma del token validado. |

Datos que se guardan (entidad `Usuario`, 03-data-model): `googleId`, `nombre`, `correo`, `fotoUrl?`, `rol = USUARIO`, `recordatoriosActivos` (Q2), `creadoEn`.

## 5. Flujo principal — iniciar sesión
1. Al abrir la app se busca una sesión guardada.
2. Sin sesión → S01 con el botón **"Continuar con Google"**.
3. El usuario toca el botón → se abre el selector nativo de cuentas → elige una.
4. La app envía el token a Supabase (`signInWithIdToken`); Supabase lo valida y crea la sesión.
5. Si es el primer inicio, el servidor crea el `Usuario`; si ya existía, actualiza nombre y foto (Q1).
6. La sesión se guarda en el almacenamiento seguro del teléfono.
7. Navega a **Inicio** (S11) o, si el usuario venía de una ruta protegida (p. ej. una notificación), a esa ruta.

## 6. Flujo alterno — sesión existente
1. Al abrir la app con sesión guardada válida → entra directo a Inicio, **sin** mostrar S01.
2. Si la sesión expiró y no se puede renovar → S01, conservando la ruta de destino.
3. **Sin internet y con sesión guardada:** entra a la app; cada pantalla muestra su propio estado "sin conexión" (no se expulsa al usuario).

## 7. Flujo alterno — cerrar sesión (desde S09)
1. El usuario toca "Cerrar sesión" → confirmación.
2. Se cierra la sesión en Supabase y en Google, y se **borra la caché de datos** de la app.
3. Navega a S01. Al reabrir la app pide iniciar sesión.

## 8. Validaciones y reglas
| ID | Regla |
|---|---|
| V1 | La identidad se toma **solo** del token validado por el servidor. |
| V2 | Un `googleId` corresponde a un solo `Usuario` (único). |
| V3 | Un usuario solo puede leer y modificar **su propio** registro sensible (correo); de otros usuarios solo se exponen nombre, foto y equipo (para rankings y S13). Lo aplica el servidor (políticas RLS). |
| V4 | El `rol` no se puede modificar desde la app. |
| V5 | La app solo contiene la clave **pública** de Supabase (diseñada para estar en el cliente; la seguridad la dan las políticas RLS). Ninguna clave secreta (servicio de Supabase, API-Football, Anthropic) está en la app (D14). |
| V6 | Todas las pantallas excepto S01 requieren sesión. |

## 9. Resultado esperado
Existe un `Usuario` con datos de Google, la sesión persiste entre aperturas de la app y el perfil (S09) muestra nombre y foto.

## 10. Casos de error
| Caso | Comportamiento |
|---|---|
| El usuario cierra el selector sin elegir cuenta | Permanece en S01, sin mensaje de error. |
| Sin internet al iniciar sesión | Mensaje "Sin conexión. Revisa tu internet e inténtalo de nuevo." + botón reintentar. |
| Servicios de Google Play ausentes o desactualizados | Mensaje indicando que se requieren/actualizan los servicios de Google Play. |
| Supabase rechaza el token o no responde | Mensaje "No pudimos iniciar sesión. Inténtalo de nuevo." + reintentar; se registra el error. |
| Toques repetidos en el botón | El botón se deshabilita mientras hay un intento en curso (sin intentos duplicados). |

## 11. Estados de pantalla (S01)
Inicial · Cargando (botón deshabilitado con indicador) · Error (mensaje + reintentar) · Sin conexión.

## 12. Criterios de aceptación
| ID | Criterio | Cómo se prueba |
|---|---|---|
| CA1 | El primer inicio de sesión crea un `Usuario` con `googleId`, nombre, correo, foto y rol `USUARIO`. | Manual + consulta a la BD |
| CA2 | Iniciar sesión de nuevo con la misma cuenta **no** crea un duplicado. | Manual + consulta a la BD |
| CA3 | Cerrar y reabrir la app conserva la sesión sin pasar por S01. | Manual |
| CA4 | Cerrar sesión lleva a S01; al reabrir pide iniciar sesión; no queda visible ningún dato del usuario anterior. | Manual |
| CA5 | Cancelar el selector deja al usuario en S01 sin error ni cierre de la app. | Manual |
| CA6 | En modo avión, S01 muestra el mensaje de sin conexión y el botón reintentar funciona al volver la conexión. | Manual |
| CA7 | Un usuario autenticado **no** puede leer el correo ni modificar el registro de otro usuario, ni cambiar su propio rol. | Prueba automatizada contra las políticas RLS |
| CA8 | Abrir una ruta protegida sin sesión lleva a S01 y, tras iniciar sesión, a la ruta original. | Manual |
| CA9 | El paquete de la app no contiene claves secretas (solo la pública de Supabase). | Revisión del código y variables de entorno |
| CA10 | Compila con TypeScript estricto sin errores ni `any`. | CI / comando de verificación de tipos |

## 13. Fuera de alcance
Otros métodos de inicio de sesión (correo, Apple), eliminar cuenta (ver Q3), editar nombre o foto dentro de la app.

## 14. Decisiones de esta spec (D55)
| ID | Decisión |
|---|---|
| Q1 | Nombre y foto se actualizan desde Google en cada inicio de sesión. |
| Q2 | `recordatoriosActivos` inicia en `true`; solo tiene efecto si el usuario concede el permiso de notificaciones (F11). |
| Q3 | Eliminar cuenta queda fuera del MVP; en el backlog como **obligatorio antes de publicar** (B18). |
| Q4 | El rol `ADMIN` se asigna manualmente en la base de datos (cuenta de Jesús y de demo si se necesita). |
