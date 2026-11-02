# Propuestas — Semana 2

> Registro de lo que Claude propone al planear cada tarea de [`S2.md`](./S2.md) y lo que Jesús responde.
> Si una propuesta cambia una regla o una decisión, también se registra en [`decisions.md`](../decisions.md).

## T01 — Reestructurar el repo (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Aprobar las tareas de S2 (estaban como borrador) → `S2.md` pasa a v1.0. | ✅ Aprobado (D73). |
| 2 | `backend/` ya no existe; solo se crea `supabase/`. | ✅ OK. |
| 3 | Crear `.gitignore` en la raíz: `.env`, `.env*.local`, `supabase/functions/.env`, `node_modules/`, temporales del CLI de Supabase (`supabase/.temp/`, `supabase/.branches/`), `.claude/worktrees/`. | ✅ Realizado. |
| 4 | `App/.env` (vacío, ya ignorado) se deja como está. | ✅ Se deja así. |
| 5 | Variables públicas de la app en `App/.env.example`: `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_KEY` (Expo exige el prefijo `EXPO_PUBLIC_`). Secretos del servidor en `supabase/functions/.env.example`: `API_FOOTBALL_KEY`. Las demás variables (ID del cliente web de Google, clave de Anthropic) se agregan en su tarea (T10, F06). | ✅ Variables aprobadas. |
| 6 | `supabase/` queda mínima; `config.toml`, `migrations/` y `functions/` reales los genera `supabase init` en T04. | ✅ Aprobado. |

**Ajuste al implementar:** no se usó `supabase/.gitkeep` porque `supabase/functions/.env.example` ya hace que git versione la carpeta. `supabase init` no choca con la carpeta existente (solo crea `config.toml` si no existe).

## T02 — TypeScript estricto, ESLint y scripts (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | App: `tsconfig.json` con `strict` + `noUncheckedIndexedAccess` (D54) y tipos de Jest; ESLint con `eslint-config-expo` (creado por `npx expo lint`) + `@typescript-eslint/no-explicit-any` como error; Jest con `jest-expo`. Scripts `typecheck` (`tsc --noEmit`), `lint` (`expo lint`), `test` (`jest --passWithNoTests`, sin modo observador para que termine solo). | ✅ OK. |
| 2 | Servidor: **opción A, Deno** (mismo entorno en el que corren las Edge Functions). `supabase/functions/deno.json` con `strict` + `noUncheckedIndexedAccess`, reglas recomendadas de `deno lint` + `no-explicit-any`, y tareas `typecheck` (`deno check`), `lint` (`deno lint`), `test` (`deno test`). Alternativa descartada: B, Node (tsc + ESLint + Vitest). | ✅ Opción A. |
| 3 | Las pruebas de RLS (T14, T27) son SQL y se corren con `supabase test db`; se configuran en T04. | — |

**Ajustes al implementar:**
- `npx expo install ... -- --dev` dejó Jest en `dependencies`; se movió a mano a `devDependencies`.
- `deno check` no acepta `--permit-no-files`; sin archivos solo muestra un aviso y termina bien.
- Nombres de archivos de prueba: en la app `*.test.ts(x)` (patrón de Jest); en el servidor `*_test.ts` o `*.test.ts` (patrón de Deno).

## Orden de T03 y T08 (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Hacer la parte de código de **T08 antes de T03** (tokens, proveedor de tema, fuentes, `Texto`, `Boton`), con su propio commit, para que las pantallas de T03 ya usen tokens y el `MenuInferior` real. Alternativa descartada: pantallas provisionales sin estilo. | ✅ Opción A. |

## T08 — Guía visual en código (2026-10-10)

| # | Propuesta / decisión al implementar | Estado |
|---|---|---|
| 1 | Tokens en `App/src/tema/tokens.ts`: colores, metales, tipografía, espacio y medidas de `05-ui.md`, en un único objeto `Tema` (`temaGrafito`). `ProveedorTema` + `useTema()`; ninguna pantalla importa colores directamente (D65). | ✅ Aprobado (opción A). |
| 2 | Nombres de la escala de espacio (05-ui solo da valores): `xxs 4 · xs 8 · s 12 · m 16 · l 20 · xl 24 · xxl 32 · xxxl 48`. | ✅ Aprobado. |
| 3 | Fuentes con `useFonts` (`expo-font`) desde `@expo-google-fonts/teko` y `/archivo`, importadas **por grosor** para que solo entren los 6 de 05-ui §3 (verificado: 6 archivos, ~830 KB). Se eligió `useFonts` en lugar del *config plugin* porque funciona en Expo Go y en el development build con el mismo nombre de familia en Android e iOS (D53). La pantalla de carga se mantiene hasta que cargan; si fallan, la app sigue con la fuente del sistema. | ✅ Aprobado. |
| 4 | **Inconsistencia en 05-ui:** el token `menu` pide Archivo **700**, pero §3 solo incluye 400/600/800. Se usa **800** para no agregar otra fuente (~120 KB). ✅ Se queda en 800 para ahorrar tamaño (D74); 05-ui actualizado a v1.1. |
| 5 | `pestana` dice "Teko 600–700": el token usa 600; la pestaña activa podrá usar 700 cuando se haga `PestanasTexto`. | Propuesta. |
| 6 | Ajuste de Teko: se baja el texto `0.08 × tamaño` (calculado de las métricas de la fuente: ascendente 958, descendente 475, mayúsculas 642). Se aplica una sola vez en `Texto`. | ✅ Verificado en el teléfono. |
| 7 | `Texto` no acepta `style` (solo `variante`, `color` de la paleta y `alineacion`) para que sea imposible usar valores sueltos. Respeta el tamaño de letra del sistema hasta 1.3×. | Propuesta. |
| 8 | `Boton` — estados que 05-ui no define: **deshabilitado** = fondo `superficie2` y texto `textoTenue` (ambas variantes); **presionado** = opacidad 0.8 (token `opacidadPresionado`); **cargando** = conserva los colores de su variante, muestra el indicador y bloquea toques. Rol y estado de accesibilidad incluidos. | ✅ Aprobado. |
| 9 | `app.json`: `userInterfaceStyle: "dark"` (D62). | Propuesta. |
| 10 | `App.tsx` es una **muestra provisional** de la guía para validarla en el teléfono; T03 la reemplaza por Expo Router. | Propuesta. |

**Ajustes al implementar:** se instaló `expo-asset` (lo necesita `expo-font` y no quedaba accesible); `@testing-library/react-native` se movió a `devDependencies`. Pruebas: 4 de `Texto` y 3 de `Boton`.

**Revisión en el teléfono (Jesús, 2026-10-10):** botones funcionan; el ajuste de Teko de 0.08 queda centrado (±1 px medido en la captura). Se encontró que `titulo1` (interlineado 0.85) **recortaba el acento** de la primera línea ("CAMPEON"); se corrigió en `Texto` ampliando la caja hacia arriba (`paddingTop`) y compensando con `marginTop` negativo, sin mover el diseño. ✅ Verificado por Jesús: ya se ve "CAMPEÓN".

## Adaptación a tamaños de pantalla (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Jesús pidió cuidar que las medidas se ajusten a distintos teléfonos. Propuesta: anchos con flex/porcentajes (nunca fijos); texto, espacios, radios y áreas táctiles en dp sin escalar por ancho; lo que no cabe se reduce solo dentro de su componente (p. ej. `SelectorMarcador`); revisar cada pantalla también en un emulador angosto. Queda en 05-ui §9. | ✅ Aprobado (D75). |

## T03 — Expo Router y rutas (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | **4 pestañas** (Inicio, Partidos, Grupos, Perfil) como dicen `02-navigation` y `05-ui` (`MenuInferior`); `S2.md` decía 3 → corregido. | ✅ 4 pestañas. |
| 2 | `scheme` de la app: `campeondesillon` (Expo Router lo pide; no configura enlaces profundos, D37 sigue igual). | ✅ Aprobado. |
| 3 | "← volver" de `EncabezadoPantalla` con flecha de **texto** dentro de `Texto`; pasa al ícono SVG "volver" cuando se instale `react-native-svg` (F12). | ✅ Aprobado. |
| 4 | Rutas en `App/src/app/` (13 pantallas de 02-navigation §3 + `index` que redirige a `/inicio`, D39). Pestañas en el grupo `(tabs)`; `equipo`, `grupos/nuevo` y `grupos/unirse` se presentan como modales. Cada pantalla es provisional (`src/provisional/PantallaProvisional`): título, parámetros recibidos y enlaces a su columna "Puede ir a", con ids de prueba. Se reemplazan al construir cada feature. | ✅ OK. |
| 5 | Componentes nuevos: `MenuInferior` (barra de 3 px en acento arriba del activo, texto `menu`, fondo `superficie`, respeta el área segura inferior) y `EncabezadoPantalla` (con/sin volver + metadato). | ✅ OK. |
| 6 | Guardia de sesión (T11) y restricción de administrador en `/admin/simulacion` (F09) **fuera** de T03. | ✅ OK. |

**Ajustes al implementar:**
- `App.tsx` e `index.ts` se eliminaron; `"main"` es `expo-router/entry` y el `_layout.tsx` raíz carga fuentes, pantalla de carga y `ProveedorTema`.
- Rutas tipadas: los tipos se generan en `.expo/types` (ignorado en git). Para que `typecheck` funcione en un repositorio recién clonado, el script es `expo customize tsconfig.json && tsc --noEmit` (regenera los tipos sin abrir el servidor). Verificado: una ruta inexistente da error de tipos.
- Texto del enlace "← Volver" con el token `menu` (05-ui no fija el token; es Archivo en mayúsculas como pide §5).
- Pruebas de rutas en `src/rutas.test.tsx` (no dentro de `src/app/`, donde contaría como ruta). `renderRouter` de expo-router no espera a `render`, que es asíncrono en @testing-library/react-native 14; se monta `ExpoRoot` con `getMockContext` directamente.
- Pruebas: 3 de `MenuInferior` y 17 de rutas (13 rutas, redirección de la raíz, cambio de pestaña, parámetros, enlace y volver).

**Revisión en el teléfono (Jesús, 2026-10-10):** dos cosas no le gustaron y se corrigieron dentro de T03:

| # | Problema → propuesta | Respuesta de Jesús |
|---|---|---|
| 7 | **Destello blanco** al cambiar de pantalla (el navegador usaba su tema claro por defecto). → Tema de navegación oscuro construido con los tokens (`src/navegacion/temaNavegacion.ts`), fondo nativo con `expo-system-ui` (`setBackgroundColorAsync` + `backgroundColor` en `app.json`) y transición `fade` (D77). | ✅ OK. |
| 8 | **El menú desaparecía** en Partido, Grupo, Usuario… (estaban en la pila raíz, encima de las pestañas). → Cada pestaña con su propia pila mediante *rutas compartidas* de Expo Router: `(tabs)/(inicio,partidos)/partido`, `(tabs)/(inicio,grupos)/grupo` y `usuario`, `(tabs)/(perfil)/admin/simulacion`. Las URLs no cambian. Sin menú: S01, S12, S05, S06, S07 (D76). | ✅ OK. |
| 9 | Tocar la pestaña activa desde un detalle regresa a su primera pantalla. | ✅ OK. |
| 10 | Cada pestaña recuerda dónde se quedó al cambiar de pestaña. | ✅ OK. |
| 11 | Simulación (S10) lleva menú. | ✅ OK. |

**Ajustes al implementar:**
- `expo-router` instaló `react-dom` 19.3 (pide React 19.3; SDK 57 fija 19.2.3) y eso rompía `expo install`. Se instaló `react-dom` 19.2.3 con `expo install` (solo se usa en web; no entra en el paquete de Android).
- Desde Crear grupo / Unirse (modales, fuera de las pestañas), el enlace al grupo indica la pestaña: `/(tabs)/(grupos)/grupo/1`. Dentro de una pestaña basta `/grupo/1` (se queda en la pestaña actual).
- `PantallaProvisional` recibe `ubicacion`: `raizPestana` · `detallePestana` · `sinMenu`.
- Pruebas de rutas: 29 (se agregaron menú visible/oculto, volver, tocar pestaña activa, recordar pestaña, modal → pestaña Grupos).
- `expo install --check` sugiere actualizar `expo` 57.0.20 → 57.0.27 (parche). No se hizo: queda para cuando Jesús lo autorice.

**Segunda revisión (Jesús, 2026-10-10):** tocar varias veces un botón apilaba copias de la misma pantalla (los enlaces usaban `router.push`, que siempre agrega una).

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 12 | Regla D78: nunca se apila la misma pantalla con los mismos parámetros; navegar con `router.navigate` / `<Link>`; los filtros de la pantalla actual (jornada, vista) se cambian con `router.setParams`. | ✅ OK. |
| 13 | Regla de lint que marca como error `router.push`, `useRouter().push`, `const { push } = useRouter()` y `<Link push>`, con mensaje que cita D78. | ✅ OK. |
| 14 | `PantallaProvisional` usa `router.navigate`. Pruebas: 3 toques al mismo enlace + un "Volver" regresan al origen; cambiar jornada (S02) y vista (S08) no duplica la pantalla. | ✅ OK. |

**Ajustes al implementar:**
- Comprobado con la pila del navegador: `push` ×3 → 3 copias; `navigate` ×3 → 1; `navigate` a la misma pantalla con otro parámetro opcional → actualiza la pantalla en su lugar.
- Las pantallas apiladas siguen montadas pero ocultas para accesibilidad, así que las pruebas cuentan con `includeHiddenElements`. Verificado que las 3 pruebas D78 **fallan** con `push` y pasan con `navigate`.
- Límite de la regla de lint: no detecta `const r = useRouter(); r.push(...)`. Se acepta; la revisión de código lo cubre.
- Total de pruebas de la app: 42.

## T04 — Proyecto de Supabase y CLI (2026-10-10)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Proyecto `campeon-de-sillon` en el plan gratis, región lo más cercana a Tijuana (West US si el panel la ofrece; si no, "Americas"). Contraseña de la base de datos solo en el gestor de contraseñas de Jesús. | ✅ Creado (ref `hhfzadtibqhbxyevpmda`, región `us-west-2`, Oregón; PostgreSQL 17). |
| 2 | Opciones de seguridad al crear el proyecto: **Data API activada** (la usa `supabase-js`); **"Automatically expose new tables" desactivado** → cada migración da los permisos (`GRANT`) explícitos, solo a `authenticated`, nunca a `anon` (F01 V6); **"Enable automatic RLS" activado** como red de seguridad (una tabla sin políticas queda cerrada, no abierta). Sin integración con GitHub: las migraciones se aplican con la CLI. | ✅ OK. |
| 3 | CLI de Supabase como dependencia de desarrollo en un `package.json` de la **raíz** (solo herramientas), versión fija; se usa con `npx supabase`. Alternativa descartada: Scoop global (la versión no queda registrada). | ✅ Opción A. |
| 4 | `supabase init` en la raíz → `supabase/config.toml` (con `project_id = "campeon-de-sillon"`) y `supabase/.gitignore`; sin ajustes de VS Code para Deno. | ✅ OK. |
| 5 | `supabase login`, `supabase link` y `supabase secrets set` los corre **Jesús** (piden token, contraseña o clave). El secreto se carga con `--env-file supabase/functions/.env` para que la clave no quede en el historial de la terminal. | ✅ OK. |
| 6 | **Pruebas de RLS con `supabase test db` pospuestas a T14** (T02 #3 decía configurarlas en T04). Requieren la base local en Docker (`supabase start`, varias imágenes grandes); se configuran cuando haya pruebas que correr. En T04 solo se verifica que Docker está instalado (29.2.0). | ✅ Pospuesto a T14. |

**Verificación (2026-10-10):** `npx supabase projects list` → proyecto `ACTIVE_HEALTHY` y `linked: true`; `npx supabase secrets list` → `API_FOOTBALL_KEY` cargado (solo se muestra su resumen). `git status` no muestra secretos: `supabase/functions/.env` y `supabase/.temp/` están ignorados; `config.toml` solo referencia secretos con `env(...)`.

**Riesgo registrado:** el plan gratis de Supabase **pausa el proyecto tras 7 días sin actividad**. Las tareas programadas de T24/T25 deberían mantenerlo activo, pero hay que confirmarlo antes de la demo (P-07); si se pausa, se reactiva desde el panel.

## T05 — Migración de datos de fútbol (2026-10-19)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Tablas y columnas en español y `snake_case`: `liga`, `torneo`, `jornada`, `equipo`, `partido`, `estadistica_partido`, `evento_partido`, `sincronizacion`. | ✅ OK. |
| 2 | Identificadores `bigint` de identidad. `proveedor_id` único en `liga`, `equipo` y `partido` (R1); jornada única por (torneo, orden); estadística única por (partido, equipo, tipo). | ✅ OK. |
| 3 | Estados como `enum` de PostgreSQL (`estado_partido`, `fase_jornada`, `tipo_evento`) para que los tipos generados sean uniones (D54). | ✅ OK. |
| 4 | `Sincronizacion`: `tipo` = `CARGA_INICIAL` · `ACTUALIZACION_DIARIA` · `DETECCION_FINALES` · `DATOS_PARTIDO` (P1–P4); `estado` = `EN_CURSO` · `EXITO` · `ERROR` · `DETENIDA_POR_TOPE` (alerta de R4). | ✅ OK. |
| 5 | `estadistica_partido.valor` como texto tal como lo manda la API; `null` = sin dato (D29). | ✅ OK. |
| 6 | `partido.proveedor_id` puede ser nulo **solo** si `es_simulado` (restricción), para F09. | ✅ OK. |
| 7 | Restricciones: local ≠ visitante, goles ≥ 0, colores `#RRGGBB` (D70), un solo torneo `es_actual` por liga; claves foráneas sin cascada (R7). | ✅ OK. |
| 8 | RLS en las 8 tablas; `authenticated` solo `SELECT` en las 7 de fútbol; `sincronizacion` cerrada para usuarios; `anon` sin acceso (F01 V6); `service_role` con permisos explícitos. | ✅ OK. |
| 9 | Índices: partido por (jornada, inicio) para S02 y por (estado, inicio) para P3. | ✅ OK. |
| 10 | Jesús aplica la migración (`db push` pide la contraseña de la base de datos); tipos generados con `npm run tipos` en la raíz hacia `App/src/supabase/tipos-db.ts` y `supabase/functions/_shared/tipos-db.ts`. | ✅ OK. |

**Ajustes al implementar:**
- Fechas de torneo y jornada como `timestamptz` (03-data-model: todas las fechas en UTC).
- Restricción `jornada_fase_segun_orden`: orden 1–17 ⇔ `REGULAR` (A7).
- Índice `evento_partido (partido_id)` para leer los eventos de un partido (S03).
- Validación antes de aplicar: la migración se corrió en un PostgreSQL local desechable (PGlite) con los roles de Supabase; 31 comprobaciones de restricciones y permisos por rol (`service_role` escribe; `authenticated` solo lee y no ve `sincronizacion`; `anon` sin acceso). Las pruebas de RLS formales siguen en T27.

## T06 — Migración de Usuario (2026-10-19)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Tabla `usuario` con `id` = `auth.users.id` (borrado en cascada); `google_id` único (V2), `nombre`, `correo`, `foto_url`, `equipo_favorito_id` → `equipo`, `rol` (`enum` `USUARIO`/`ADMIN`, por defecto `USUARIO`), `recordatorios_activos` (por defecto `true`, Q2), `creado_en`. | ✅ OK. |
| 2 | Disparador al crear el usuario en `auth.users`: crea `usuario` con los datos del token de Google validado (V1): `sub`, correo, nombre, foto. | ✅ OK. |
| 3 | Q1: disparador cuando Supabase actualiza los datos de Google en cada inicio de sesión → copia `nombre` y `foto_url` (no el correo). | ✅ OK. |
| 4 | Solo cuentas de Google: con otro proveedor la creación de la cuenta falla. El registro por correo se desactiva además en el panel en T10. | ✅ OK. |
| 5 | Si Google no manda nombre, se usa la parte del correo antes de la @. | ✅ OK. |
| 6 | RLS: cada usuario lee solo su fila (con correo y `rol`, que S09 usa para S10); `authenticated` no inserta ni borra; `anon` sin acceso. | ✅ OK. |
| 7 | `UPDATE` por columna solo en `recordatorios_activos` (F11) y `equipo_favorito_id` (F18), y solo en la fila propia; `rol`, correo, nombre y `google_id` sin permiso (V4). | ✅ OK. |
| 8 | Vista `usuario_publico` (`id`, `nombre`, `foto_url`, `equipo_favorito_id`) con los permisos de su dueño, legible por `authenticated`. El asesor de Supabase la marca como "security definer view"; es intencional y está comentado. | ✅ OK. |
| 9 | La vista muestra a todos los usuarios autenticados; si se restringe a quienes comparten grupo, se cambia en F07. | ✅ OK. |
| 10 | Validación en PGlite; Jesús aplica con `db push`; tipos con `npm run tipos`. `ADMIN` se asigna a mano (Q4). | ✅ OK. |

**Ajustes al implementar:**
- Las funciones de los disparadores son `security definer` con `search_path` vacío, y se les quitó el permiso de ejecución a `public`, `anon` y `authenticated` (solo las usan los disparadores).
- El disparador de Q1 solo corre si cambian los datos de Google (`raw_user_meta_data`); otros cambios en `auth.users` no tocan `usuario`. Si Google deja de mandar nombre, se conserva el anterior.
- Validación antes de aplicar: PGlite con un `auth.users` y un `auth.uid()` simulados; 25 comprobaciones (creación, rechazo de cuentas que no son de Google, V2, Q1, V3, V4, CA7, vista pública, `anon`). Los nombres de los campos de Google (`sub`/`provider_id`, `full_name`/`name`, `avatar_url`/`picture`) son los que documenta Supabase; se confirman con una cuenta real en T12 (CA1). Las pruebas automáticas de RLS siguen en T14.

## T07 — Development build y tamaño (2026-10-19)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 0 | Compilar en la nube con **EAS Build** (plan gratis: 15 compilaciones de Android al mes, cola de baja prioridad) y usar Android Studio solo para el emulador y `adb`. El equipo no tenía Android SDK y su Java es 24. Alternativa descartada: todo local (riesgo con las rutas largas de Windows en la compilación nativa). | ✅ Opción A. |
| 1 | `app.json`: `name` "Campeón de Sillón" (D63), `slug` `campeon-de-sillon`, `android.package` `mx.campeondesillon.app` (D64), `android.versionCode` 1. | ✅ OK. |
| 2 | `expo-dev-client` instalado con `npx expo install`. | ✅ OK. |
| 3 | `eas-cli` como dependencia de desarrollo con versión fija. | ✅ Aprobado, pero **reemplazado** (ver ajustes). |
| 4 | `eas.json`: perfil `development` (cliente de desarrollo, distribución interna, APK). | ✅ OK. |
| 5 | Jesús crea la cuenta de Expo y corre `login`, `init` y el primer `build`; EAS genera y guarda la llave de firma (su SHA-1 se usa en T10). | ✅ Cuenta personal `jesus_rodriguez`. |
| 6 | Instalación del APK en el teléfono y `npx expo start` en la misma red. | ✅ Validado por Jesús: abre y navega. |
| 7 | Medir P-20 con un AAB de producción y `bundletool get-size total` (el development build no representa la descarga). | ✅ OK. |
| 8 | Tope de descarga de **30 MB** en `arm64-v8a` (medido: ~24 MB). | ✅ Aprobado (D79). |
| 9 | Ícono y pantalla de carga sin cambios hasta M6 (UI-01). | ✅ OK. |

**Ajustes al implementar:**
- **`eas-cli` fuera del proyecto** (reemplaza #3): `expo-doctor` indica que no debe instalarse en el proyecto, y EAS reinstalaría la herramienta en cada compilación. Se usa como `npx eas-cli@24.12.1` (24.12.1: última de la serie 24; la 25 acababa de salir) y la versión mínima queda en `eas.json` (`cli.version`).
- **Parches de Expo alineados** antes de la primera compilación (pendiente desde T03): `npx expo install --fix` actualizó 7 paquetes (`expo` 57.0.20 → 57.0.30). npm dejó `expo-modules-core` anidado dentro de `expo/` y las pruebas fallaban (`jest-expo` no lo encontraba); se movió a la raíz en `package-lock.json` y se reinstaló con `npm ci`. `expo-doctor`: 21/21.
- **Node fijo en EAS:** la primera compilación falló en `npm ci` porque EAS usa Node 22 / npm 10 y el `package-lock.json` se genera con Node 24 / npm 11 (npm 10 lo veía incompleto: `@emnapi/core`, `@emnapi/runtime`). `eas.json` tiene un perfil `base` con `"node": "24.11.1"` del que heredan `development` y `production`.
- **Perfil `production`** (AAB) agregado para la medición; `appVersionSource: local` (la versión se lleva en `app.json`).
- **Emulador de D75:** `Angosto_320dp` (720×1280 a 360 dpi = 320 dp, Android 17 / API 37), creado a partir del "Medium Phone" que instaló Android Studio, sin descargas extra. Variables de usuario `ANDROID_HOME` y `platform-tools` en el `PATH`. El APK de desarrollo se instaló en el emulador y la app abre a 320 dp; el menú inferior cabe, con "PARTIDOS" y "GRUPOS" muy juntos.

**Medición (P-20):** descarga desde Google Play en `arm64-v8a` = **23.8–24.0 MB**; AAB 70.3 MB; APK de desarrollo 258.9 MB. Detalle en `04-tech-stack.md` §7.

## T10 — Credenciales de Google y proveedor en Supabase (2026-10-20)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Claude da la guía paso a paso; Jesús configura las consolas (Google Cloud, Supabase) y corre `eas credentials`. | ✅ OK. |
| 2 | SHA-1 de la llave de firma que EAS generó en T07 (la misma para los perfiles `development` y `production`). | ✅ OK. |
| 3 | Pantalla de consentimiento solo con permisos básicos (`openid`, `email`, `profile`) y **sin logo** (el logo obliga a verificar la marca). | ✅ OK. |
| 4 | Público de la app: **"In production"** (cualquier cuenta de Google puede entrar; con permisos básicos no requiere verificación). Alternativa descartada: "Testing" (solo cuentas agregadas a mano; riesgo de dejar fuera al docente o a las cuentas de demo). | ✅ "In production", pero **reemplazado** (ver ajustes). |
| 5 | Dos clientes OAuth: **Android** (paquete `mx.campeondesillon.app` + SHA-1) y **web** (su ID es la audiencia del token que valida Supabase). | ✅ OK. |
| 6 | Supabase: proveedor Google activado con el ID y el secreto del cliente web; **proveedor de correo desactivado** (pendiente de T06 #4). | ✅ OK. |
| 7 | `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` en `App/.env.example` (público). El secreto del cliente web solo vive en el panel de Supabase (D14). `supabase/config.toml` no cambia (solo configura la base local). | ✅ OK. |

**Ajustes al implementar:**
- **Público en "Testing"** (reemplaza #4): Google no deja pasar a "In production" sin URL de página principal y de política de privacidad, y el MVP no tiene ninguna de las dos. Solo pueden iniciar sesión las cuentas agregadas en **Audience → Test users** (máx. 100): la de Jesús, las de demo y la del docente. Sin efecto en la sesión: la app solo usa el token de identidad de Google al iniciar sesión; después la sesión es de Supabase (el vencimiento de 7 días de "Testing" aplica a los permisos que Google guarda, que no se usan). La página principal y la política de privacidad pasan al backlog como requisito para publicar (B21).

**Verificación (2026-10-24):** `GET /auth/v1/settings` con la clave publishable → `google: true`, `email: false`, `disable_signup: false`. `App/.env` tiene la URL, la clave publishable y el ID del cliente web con formato válido; `App/.env` sigue ignorado por git. Que el token de Google llegue y Supabase lo acepte (audiencia = cliente web, SHA-1 correcta) se comprueba en T12 (CA1).

**Riesgo registrado:** antes de la demo (P-07) hay que confirmar que todas las cuentas que van a iniciar sesión estén en "Test users"; una cuenta fuera de la lista no puede entrar.

**Riesgo registrado:** si la app se publica en Google Play, Google vuelve a firmarla con su propia llave (Play App Signing); habrá que crear un tercer cliente Android con esa SHA-1. No aplica al MVP (se instala con EAS).

## T11 — Cliente de Supabase, sesión y guardia de rutas (2026-10-24)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Sesión en SecureStore **partida en trozos** de hasta 2000 bytes (UTF-8): la sesión pesa ~3–4 KB y SecureStore puede rechazar valores de más de 2048 bytes (iOS, D53). Alternativa descartada: AsyncStorage cifrado con AES (3 librerías más). | ✅ Trozos. |
| 2 | **Sin internet con sesión guardada** (F01 §6.3): supabase-js 2.118, al abrir sin internet con el token vencido, responde "sin sesión" con un error de red pero conserva la sesión guardada. Ese caso cuenta como `conSesion`; la sesión se renueva sola al volver la conexión. Si el servidor rechaza la renovación (sesión revocada), pasa a `sinSesion` y va a S01 conservando el destino (§6.2). | ✅ OK. |
| 3 | Sin `react-native-url-polyfill`; se agrega solo si una consulta real falla por `URL` (T12/T26). | ✅ OK. |
| 4 | `expo-secure-store` es nativo: **no se compila en T11**. T11 se valida con pruebas automáticas y la compilación se hace una sola vez en T12 junto con Google Sign-In. Hasta entonces la app nueva no corre en el development build actual. | ✅ OK. |

**Ajustes al implementar:**
- Librerías: `@supabase/supabase-js` 2.118 y `expo-secure-store` ~57.0.4 (`npx expo install`, que agregó su plugin en `app.json`).
- `src/supabase/cliente.ts`: cliente tipado con `Database`, solo variables `EXPO_PUBLIC_` (V5); si faltan, error claro al arrancar. La renovación automática se pausa en segundo plano y se reanuda al volver (`AppState`).
- `src/supabase/almacenSeguro.ts`: `<clave>.n` guarda cuántos trozos hay y `<clave>.<i>` cada uno; un trozo perdido cuenta como "sin sesión". Las operaciones van en fila para que una escritura y un borrado simultáneos no mezclen trozos.
- `src/sesion/ProveedorSesion.tsx`: estado `cargando | sinSesion | conSesion` y el destino pendiente (en memoria, sin cambiar las URLs de 02-navigation). La pantalla de carga sigue visible mientras se lee la sesión.
- **Guardia:** las pantallas que requieren sesión se movieron al grupo `src/app/(protegidas)/` (las URLs no cambian); su `_layout` guarda la ruta pedida (camino + parámetros de consulta) y redirige a `/login`. `/login` con sesión redirige al destino o a `/inicio`. Se usó esto en lugar de `Stack.Protected` porque en SDK 57 este no conserva la ruta pedida (CA8) y `redirectTo` llega hasta SDK 58.
- Los enlaces con grupo explícito de S05/S06 pasan a `/(protegidas)/(tabs)/(grupos)/grupo/1`.
- Pruebas: 10 del almacenamiento (`almacenSeguro.test.ts`) y 16 de la guardia (`sesion/guardia.test.tsx`) con un cliente de Supabase falso (`src/pruebas/supabaseFalso.ts`); `rutas.test.tsx` corre con sesión guardada (las pruebas de `/login` pasaron a la guardia).
- **Para T13:** al cerrar sesión, la guardia guarda la pantalla actual como destino (igual que si la sesión expira). T13 debe limpiar el destino al cerrar sesión a propósito, para que el siguiente inicio vaya a Inicio.

## T12 — Pantalla S01 e inicio de sesión con Google (2026-10-24)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | **Sin *config plugin*** de `@react-native-google-signin/google-signin`: en Android funciona con el enlace automático de módulos. El plugin exige un `iosUrlScheme` (cliente OAuth de iOS, que no existe) y sin opciones busca `google-services.json` de Firebase. Para iOS queda en el backlog (B22). Alternativa descartada: crear ya el cliente de iOS. | ✅ Opción A. |
| 2 | **"Sin conexión" por el tipo de error**, sin librería nueva: error de red de Google en Android (código `7`, `CommonStatusCodes.NETWORK_ERROR`) y `AuthRetryableFetchError` de Supabase. Alternativa descartada: `@react-native-community/netinfo` (nativa, más tamaño, no está en las specs). | ✅ Opción A. |
| 3 | Diseño de S01 (05-ui no lo define): nombre de la app en `titulo1` + botón primario "Continuar con Google". En error / sin conexión: mensaje en `cuerpo` + "Reintentar" secundario en lugar del primario (05-ui §6). Cargando: el primario en estado `cargando`. | ✅ Opción A. |
| 4 | Textos de F01 §10 literales; servicios de Google Play: "Necesitas instalar o actualizar los servicios de Google Play para iniciar sesión." más el aviso nativo de actualización (`showPlayServicesUpdateDialog`). Otros errores de Google (p. ej. SHA-1 que no coincide) usan el mensaje genérico. "Se registra el error" = `console.error` (no hay servicio de registros). | ✅ OK. |
| 5 | Nuevo development build (Google Sign-In y `expo-secure-store` son nativos), alineando antes los parches `expo` 57.0.31 y `expo-router` 57.0.29. | ✅ OK. |

**Ajustes al implementar:**
- Librería `@react-native-google-signin/google-signin` 16.1.5 (versión gratuita, API "original" de Google Sign-In). `npx expo install` la agregó sola a `plugins` de `app.json`; se quitó (#1).
- npm volvió a dejar `expo-modules-core` anidado dentro de `expo/` al actualizar `expo` (igual que en T07); se movió a la raíz en `package-lock.json` y se reinstaló con `npm ci`. `expo-doctor`: 21/21.
- `src/sesion/iniciarSesionGoogle.ts`: servicios de Google Play → selector → `signInWithIdToken({ provider: 'google', token })`; devuelve `exito | cancelado | sinConexion | sinServiciosGoogle | error`. Google se configura con `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` la primera vez que se usa. Al terminar bien no navega: el proveedor de sesión (T11) recibe `SIGNED_IN` y `/login` redirige al destino o a Inicio.
- Toques repetidos: el botón queda en `cargando` y además una referencia bloquea un segundo intento si dos toques llegan antes de que se deshabilite.
- Pruebas: simulacro de Google en `__mocks__/@react-native-google-signin/google-signin.ts` (se aplica solo en todas las pruebas) controlado desde `src/pruebas/googleFalso.ts`; `supabaseFalso` agrega `signInWithIdToken`, que emite `SIGNED_IN` como el cliente real. 10 pruebas del flujo y 9 de la pantalla; `guardia.test.tsx` reconoce S01 por su botón. Total de la app: 85.

**Validación en el teléfono (Jesús, 2026-10-24):** development build nuevo (Google Sign-In + `expo-secure-store`); CA1, CA2, CA5 y CA6 ✅.

## T13 — Cerrar sesión (2026-10-24)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Confirmación con el **aviso nativo** (`Alert`): "¿Cerrar sesión?" con "Cancelar" y "Cerrar sesión". 05-ui no define un diálogo propio. Alternativa descartada: modal propio con tokens. | ✅ Opción A. |
| 2 | **Caché de datos:** se instala TanStack Query (D51) desde ahora, con un cliente único (`src/datos/clienteConsultas.ts`) y `QueryClientProvider` en la raíz; al cerrar sesión se vacía con `clear()`. Alternativa descartada: un punto de limpieza vacío para conectarlo en T26. | ✅ Opción A. |
| 3 | Cierre en Supabase con `scope: 'local'`: solo este teléfono; los demás dispositivos siguen dentro. Alternativa descartada: `global` (el valor por defecto de Supabase). | ✅ Opción A. |
| 4 | **Sin internet:** supabase-js 2.118 borra la sesión del teléfono aunque no alcance al servidor, salvo si el token venció y no hay internet para renovarlo; en ese caso se queda en S09 con "Sin conexión. Revisa tu internet e inténtalo de nuevo." y la sesión sigue abierta. Si falla el cierre en Google, se registra y no bloquea. | ✅ Opción A. |

**Ajustes al implementar:**
- `@tanstack/react-query` **5.104.1** con `npx expo install` (solo JavaScript: no requiere otro development build). `expo-modules-core` no se anidó esta vez; `expo-doctor`: 21/21.
- `ProveedorSesion` expone `cerrarSesion()` → `exito | sinConexion | error`. `sinSesion` lleva `motivo`: `inicial` · `terminada` · `cerrada` (unión discriminada, D54). Con `cerrada` el destino se limpia y la guardia no guarda la ruta actual (pendiente de T11): el siguiente inicio va a Inicio. Si la sesión termina sola (§6.2) se sigue conservando la ruta.
- Orden: Supabase → Google (`GoogleSignin.signOut`, para que el selector de cuentas vuelva a aparecer) → caché. Google se configura antes de cerrar, porque si la app abrió con sesión guardada no se había configurado (`configurarGoogle` ahora se exporta desde `iniciarSesionGoogle.ts`).
- `src/sesion/BotonCerrarSesion.tsx`: botón secundario; mientras se cierra queda en `cargando` y una referencia bloquea una segunda confirmación. Mensaje de otros errores (F01 no lo define): "No pudimos cerrar sesión. Inténtalo de nuevo."; el mismo botón reintenta.
- S09 sigue siendo provisional: se quitó su enlace a `/login` y `PantallaProvisional` ahora dibuja `children` fuera del bloque "Rutas (provisional T03)".
- Pruebas: 13 en `sesion/cerrarSesion.test.tsx` (confirmar/cancelar, Supabase `local` + Google, S01 sin pestañas, caché vacía, destino limpio, sesión que termina sola, sin internet en sus dos casos, error, reintento, doble confirmación). `supabaseFalso` agrega `signOut`, que emite `SIGNED_OUT` cuando borra la sesión, como el cliente real. Verificado que las pruebas del destino **fallan** si la guardia guarda la ruta al cerrar sesión. Total de la app: 98.

## T14 — Pruebas automatizadas de RLS de `usuario` (2026-10-31)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Pruebas pgTAP con `supabase test db` contra una **base local en Docker** (`npx supabase db start`, solo Postgres; migraciones con `npx supabase db reset`). Alternativa descartada: correrlas contra el proyecto real (`--linked`), que insertaría usuarios de prueba en producción aunque se deshagan. | ✅ Opción A. |
| 2 | Además de los permisos (CA7, V3, V4, V6), probar los **disparadores de T06** (CA1, CA2/V2, solo Google, Q1, nombre desde el correo), que en T06 solo se validaron una vez en PGlite. | ✅ Opción A. |
| 3 | Jesús abre Docker Desktop; Claude corre `db start`, `db reset` y `test db` (son locales y no piden contraseñas). | ✅ Opción A. |

**Ajustes al implementar:**
- `supabase/tests/usuario_rls.test.sql` (31 pruebas): dos usuarios de Google (A y B) creados en `auth.users`; se actúa como cada uno con `set local role authenticated` y `request.jwt.claims`. Cubre: A solo ve su fila (y lee su correo y rol); no lee el correo de B (CA7); cambia `recordatorios_activos` y `equipo_favorito_id`; no cambia su `rol` (CA7), correo, nombre, foto, `google_id` ni `id` (V4); no modifica ni borra la fila de B (CA7); no inserta ni borra; `usuario_publico` muestra a todos solo con `id`, `nombre`, `foto_url` y `equipo_favorito_id` (V3) y no se puede modificar; `anon` no lee ni modifica nada (V6); al final, como `postgres`, se verifica que en la base solo cambió lo permitido.
- `supabase/tests/usuario_disparadores.test.sql` (21 pruebas): creación con todos los datos de CA1 y `recordatorios_activos = true` (Q2); variantes `sub`/`name`/`picture`; nombre desde el correo; segunda cuenta con el mismo `googleId` rechazada (V2/CA2); cuentas que no son de Google o sin id rechazadas; Q1 actualiza nombre y foto pero no el correo, conserva el nombre si Google no lo manda y no toca recordatorios ni rol; otros cambios en `auth.users` no tocan `usuario`; borrar la cuenta borra el usuario (B18); `anon` y `authenticated` no ejecutan las funciones de los disparadores.
- Todo corre en una transacción que se deshace (`rollback`). `supabase test db` activa pgTAP solo; los archivos no lo crean.
- Script `npm run test:db` en la raíz (`supabase test db --local`). Requiere Docker Desktop abierto y la base local arrancada (`npx supabase db start`; tras una migración nueva, `npx supabase db reset --local`).
- `db start` descargó también las imágenes de `gotrue` y `pg_prove` (la primera vez tarda unos minutos).
- **Las pruebas detectan fallas:** se rompieron a propósito los permisos en la base local (políticas abiertas a todos, `UPDATE` de `rol` y `correo`, `SELECT` para `anon`, `INSERT`/`DELETE` para `authenticated`, sin el `UNIQUE` de `google_id`, ejecución de `crear_usuario` para `authenticated`) y fallaron 18 pruebas que cubren cada cambio; tras `db reset` vuelven a pasar las 52.
- La CLI avisa que hay una versión nueva (2.122.0; el proyecto fija 2.120.0). No se actualizó.

## T20 — Ejemplos reales de API-Football (2026-10-31)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Guardar 4 respuestas en `supabase/functions/_shared/ejemplos-api-football/`: `fixtures` y `teams` de la Liga MX 2024 (262), `statistics` y `events` del partido 1206057 (D29). Claude da los comandos (PowerShell + `curl.exe`, la clave se lee de `supabase/functions/.env`), Jesús los corre. | ✅ OK. |
| 2 | 5ª consulta a `season=2026` para tener una respuesta **real** con `errors` no vacío (R6, CA6) en vez de una escrita a mano. | ✅ OK. |
| 3 | Versionar los JSON en el repo (las pruebas los usan sin conexión y sin gastar consultas), formateados con sangría; documentar origen y comandos en `LEEME.md`. | ✅ OK. |

**Ajustes al implementar:**
- 5 consultas usadas. Verificado: `errors` vacío y conteos esperados (340 partidos, 18 equipos, 2 estadísticas, 15 eventos); ningún archivo contiene la clave. El formato con sangría no cambió el contenido (comparado tras volver a leerlo).
- La temporada 2024 trae el **Apertura 2024 y el Clausura 2025** (170 partidos cada uno: 153 de fase regular, como pide CA1, + 17 de liguilla).
- `errors` es `[]` cuando no hay error y un objeto cuando lo hay → el esquema de T21 debe aceptar ambas formas.
- Solo hay estados `FT` (338) y `PEN` (2, en reclasificación, con `extratime` en `0-0`); **no hay `AET`**. CA4 (T22) se prueba con un partido `PEN` (`fulltime` 2-2 frente a `penalty` 2-3), que cubre R2.
- Las estadísticas mezclan números, textos con `%` y `null`.
- **Diferencia con la spec F02 §A7:** las rondas de liguilla llegan con prefijo (`Apertura - Quarter-finals`, `Clausura - Reclasificacion`), no sin él como decía la tabla. Resuelto en T22 (D80).

## T21 — Esquemas Zod de las respuestas de API-Football (2026-10-31)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Zod **4.6.7** (versión exacta) en el servidor como `npm:zod@4.6.7` en el `imports` de `supabase/functions/deno.json`; se versiona `deno.lock`. | ✅ OK. |
| 2 | Un esquema común de respuesta (`errors` acepta `[]` u objeto de textos) y uno por consulta (fixtures, teams, statistics, events) que **solo valida los campos que se usan** y descarta los demás. Tipos exportados con `z.infer`. | ✅ OK. |
| 3 | Estado, ronda y tipo de evento como **texto libre**, no enum: un valor desconocido solo afecta a ese partido y se maneja al convertirlo (A6, A7, T22), en vez de rechazar la respuesta entera por R5. | ✅ Como texto. |
| 4 | Pruebas con los ejemplos de T20 (pasan, con sus conteos y los `null` conservados) y con formas inválidas armadas a partir de ellos (deben fallar). | ✅ OK. |

**Ajustes al implementar:**
- La parte común de la respuesta solo valida `errors` y `response`; `get`, `parameters`, `results` y `paging` no se usan y se descartan.
- La respuesta común es un `z.object` que cada consulta extiende con `.extend({ response })`, en vez de una función genérica.
- **`"nodeModulesDir": "auto"` en `supabase/functions/deno.json` (✅ aprobado por Jesús):** con la caché global de npm, `deno check` (Deno 2.9.7, Windows) tomaba los tipos de **cualquier** paquete npm como `any` (probado con Zod 3 y 4 y date-fns), así que la verificación de tipos no servía. Con `node_modules` local sí los lee (se confirmó con errores provocados a propósito). `supabase/functions/node_modules/` ya lo ignora el `node_modules/` del `.gitignore` raíz. **Pendiente para T23:** confirmar que el despliegue con la CLI de Supabase funciona con esta opción.
- Las aserciones de las pruebas usan `node:assert/strict` (viene con Deno; no agrega dependencias).
- 17 pruebas en `_shared/api-football/esquemas_test.ts`. **Las pruebas detectan fallas:** con los esquemas rotos a propósito (marcador, `errors`, fecha, valor de estadística y minuto del evento sin validar) fallaron 6 pruebas; restaurados, vuelven a pasar las 17.
- Cubre R5 y la parte de forma de CA6 (una forma inválida no cumple el esquema; un solo partido inválido rechaza toda la respuesta). Que ningún dato cambie y quede el registro de error se prueba en T23.

## T22 — Conversiones y tope de consultas (2026-11-01)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | `convertirEstado` (A6, Q2) y `convertirRonda` (A7) devuelven uniones discriminadas (`ok` / `desconocido(a)`); registrar el error le toca a quien llama (T23–T25). Los estados y fases usan los tipos generados de la base. | ✅ OK. |
| 2 | Las rondas llegan todas con prefijo: se quita `prefijoRondas` y se compara el resto normalizado; la tabla A7 de F02 se corrige con los nombres reales. | ✅ Sí, en T22 (D80). |
| 3 | Una ronda del **otro torneo** de la temporada devuelve `otroTorneo` (P1 la ignora sin error) en vez de "desconocida", que daría 170 errores falsos. | ✅ OK (D80). |
| 4 | `orden` **fijo** de la liguilla: play-in 18, cuartos 19, semifinales 20, final 21 (en 2026 empieza en 19). Alternativa descartada: numerarlas seguidas en P1 según las rondas que existan. | ✅ OK (D80). |
| 5 | Día de consultas de R4 en **UTC** (00:00–00:00), cuando API-Football reinicia el límite diario. | ✅ OK (D80). |
| 6 | `marcadorDePartido` (R2) toma `score.fulltime` y `score.halftime`; `TOPE_CONSULTAS_DIARIAS = 90` y el tope solo detiene P1/P2. | ✅ OK. |

**Ajustes al implementar:**
- Archivos: `_shared/api-football/conversiones.ts` (estado, ronda, marcador) y `_shared/sincronizacion/tope-consultas.ts` (`puedeConsultar`, `inicioDelDiaDeConsultas`), con sus pruebas.
- La función del tope se llama `puedeConsultar(consultasDelDia, proceso)` y devuelve `boolean` (se había propuesto como `revisarTope`).
- `marcadorDePartido` devuelve los nombres de las columnas de `partido` (`goles_local`, `goles_local_medio_tiempo`…), tipados con `Tables<'partido'>`.
- Los estados se guardan en un `Map` y no en un objeto, para que claves heredadas como `toString` no pasen por un estado válido (hay prueba).
- El prefijo se separa solo por ` - ` con espacios, para que el guion de `Play-offs` no lo corte. Una ronda sin prefijo (`Final`) es desconocida.
- 18 pruebas nuevas (35 en total en el servidor): CA3 con toda la tabla A6; A7 con las rondas reales de 2024 (el Apertura da 17 jornadas de 9 partidos, play-in 3, cuartos 8, semifinales 4 y final 2; los 170 del Clausura son `otroTorneo`); CA4 con el partido real con penales 1315387 y uno con tiempo extra armado a partir del 1206004; CA5 con 89/90/91 consultas por proceso; día UTC con horario de verano e invierno de Tijuana.
- **Las pruebas detectan fallas:** con el código roto a propósito (sin `WO`, cuartos con orden 18, marcador de medio tiempo en vez de 90 min, otro torneo como desconocida, tope con `<=`) fallan 8 pruebas, y sin quitar los acentos (prueba aparte) fallan 4; restaurado, vuelven a pasar las 35.
- Registrar la alerta de R4 y que ningún dato cambie ante errores (CA5, CA6 completos) se prueba en T23 junto con la base.

## T23 — Carga inicial P1 (2026-11-01)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | `nombre_corto` desde una **tabla fija en el servidor** por `proveedorId`; sin registro, el nombre de la API (A8). | ✅ OK, y agregar a **Atlante** para 2026 (reemplaza a Mazatlán) → D81. |
| 2 | Guardado en **una sola transacción** con la función SQL `guardar_carga_inicial(carga jsonb)`, ejecutable solo por `service_role`; ahí también se desmarca el `es_actual` anterior. Alternativa descartada: varios `upsert` sueltos con `supabase-js` (una falla a la mitad dejaría datos a medias, contra R5/R7). | ✅ OK. |
| 3 | La Edge Function `carga-inicial` solo acepta la **clave secreta** (`withSupabase({ auth: 'secret' })` de `@supabase/server`, `verify_jwt = false`); Jesús la invoca desde su terminal, sin pantalla en la app. | ✅ OK. |
| 4 | CA1/CA2 con una prueba de Deno contra la **base local de Docker** (`deno task test:bd`, fuera de `deno task test`); CA6 con dobles de prueba, sin base. | ✅ OK. |
| 5 | Errores parciales: ronda desconocida → el partido no se guarda (A7); estado desconocido → nuevo como `PROGRAMADO`, existente conserva el suyo (A6); se guarda el resto y el registro cierra `EXITO` con la lista en `error`. | ✅ OK. |

**Ajustes al implementar:**
- Atlante FC = `proveedorId` **2312** (consulta `/teams?search=Atlante`, 1 consulta, hecha por Jesús).
- Archivos: `carga-inicial/index.ts` (+ su `deno.json`, como recomienda la documentación de Supabase para desplegar), `_shared/api-football/cliente.ts`, `_shared/datos-equipos.ts`, `_shared/sincronizacion/carga-inicial.ts` (armado puro + ejecución con dependencias inyectadas), `_shared/sincronizacion/repositorio.ts` (`supabase-js`), migración `20261102063541_carga_inicial.sql` y `[functions.carga-inicial]` en `config.toml`.
- Dependencias nuevas con versión exacta: `@supabase/server@1.9.2`, `@supabase/supabase-js@2.118.0` y `postgres@3.4.9` (solo para la prueba contra la base; la 4.0.0 tenía 3 días). Con el `deno.json` propio de la función los tipos de npm también son reales (verificado con errores provocados).
- `@supabase/server` solo acepta las claves nuevas (`sb_secret_…`); el proyecto ya las usa (`sb_publishable_…` en la app). `auth: 'secret'` acepta solo la clave secreta llamada `default`.
- Cuerpo de la petición validado con Zod: `{ temporada, prefijoRondas, nombre, esActual }`. `esActual: false` no desmarca un torneo; solo lo desmarca la carga de otro marcado como actual.
- El esquema de partidos (T21) ahora también valida `league.name` y `league.country`, que la carga usa para crear `liga`.
- P1 hace 2 consultas (`/teams` y `/fixtures`). Cada una se anota en `sincronizacion.consultas_usadas` **antes** de hacerla, para que cuente en R4 aunque falle. Respuesta HTTP: 200 `EXITO`, 429 `DETENIDA_POR_TOPE`, 502 `ERROR`.
- `guardar_carga_inicial` no toca los colores (D70), `esta_cerrada` ni `calificado_en`. Usa `left join` para que una jornada o un equipo inexistente aborte toda la carga en vez de omitir el partido sin avisar.
- Tipos: `supabase gen types --local` usa otro formato que `--linked`, así que se agregó a mano la firma de `guardar_carga_inicial` en los dos `tipos-db.ts`; se confirma con `npm run tipos` después de `db push`.
- Pruebas: 24 nuevas sin base (3 del cliente, 11 de armado y 10 de ejecución; 59 en total) y 6 contra la base local (`deno task test:bd`): CA1 (18 equipos, 21 jornadas, 17 regulares, 170 partidos, 153 de fase regular), CA2 (repetir no cambia conteos ni ids), A6 (nuevo horario y estado desconocido), R5/R7 (una carga que falla no deja nada a medias), `es_actual` y permisos de la función.
- **Las pruebas detectan fallas:** con el código roto a propósito (sin R6, sin tope, sin la clave en el encabezado, sin `/teams`, sin un nombre corto, otro torneo anotado como omitido) fallan 11 pruebas sin base; con la migración rota (estado desconocido sobrescrito, sin desmarcar `es_actual`, `authenticated` con permiso, `nombre_corto` alterado al repetir) fallan exactamente las 4 pruebas de base correspondientes. Restaurado, todo pasa. Al hacerlo se corrigió la prueba de permisos, que pasaba aunque `authenticated` pudiera ejecutar la función (la tabla negaba el acceso de todos modos); ahora revisa `has_function_privilege`.
- README: comandos de las pruebas contra la base local (`npm run test:db` y `deno task test:bd`).
- Tipos: tras `db push`, `npm run tipos` generó exactamente la firma agregada a mano.
- **Ejecución real (2026-11-02, Jesús):** migración aplicada, función desplegada (`verify_jwt: false`) y carga del Apertura 2024 ejecutada **dos veces**. `sincronizacion`: dos registros `CARGA_INICIAL` · `EXITO` · 2 consultas · sin error (R8). Conteos en la base real: 18 equipos, 21 jornadas (17 regulares), 170 partidos (153 de fase regular), 1 torneo actual → **CA1** y **CA2** (la segunda carga no duplicó nada).
- Al invocarla: pegar la clave en `Read-Host` no funciona en la terminal de la app (solo llega el carácter de Ctrl+V y la puerta de Supabase responde 400 sin cuerpo). Se lee con `Get-Clipboard -Raw`, comprobando que empiece con `sb_secret_` antes de usarla; el comando se pega en la terminal **antes** de copiar la clave.

## T24 — Actualización diaria P2 y tarea programada (2026-11-02)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | **`partido.cierre_predicciones`**: nace igual a `inicio`; un cambio de horario antes del cierre lo mueve, uno después no (R9, D46). Sin él, un partido pospuesto después de empezar reabriría sus predicciones. | ✅ OK (D82, 03-data-model v1.3). |
| 2 | Tarea a las **14:00 UTC** (06:00 en Tijuana en horario de invierno) en vez de las 13:00 de la nota de S2. | ✅ OK (D83). |
| 3 | Tarea programada en una **migración** con `pg_cron` + `pg_net`; la URL del proyecto y la clave secreta, en **Vault** (las carga Jesús, no van al repo). | ✅ OK (D83). |

**Ajustes al implementar:**
- P2 = Edge Function `actualizacion-diaria` (clave secreta, `verify_jwt = false`, sin cuerpo): busca el torneo con `es_actual` de la Liga MX, hace **1 consulta** (`/fixtures`), arma con el mismo armado de P1 (equipos tomados de los partidos, A8) y guarda con la misma `guardar_carga_inicial`; registro `ACTUALIZACION_DIARIA`. Sin torneo actual → `ERROR` sin consultar la API. Como reutiliza la carga, también crea las jornadas y partidos de liguilla cuando la API los publica.
- P2 manda `es_actual: false` (no cambia la marca del torneo, T23).
- Refactor: `carga-inicial.ts` → **`sincronizacion-torneo.ts`** con un núcleo común (`sincronizarTorneo`) y dos entradas, `ejecutarCargaInicial` (P1) y `ejecutarActualizacionDiaria` (P2). Renombres: `CargaInicial` → `CargaTorneo`, `armarCargaInicial` → `armarCargaTorneo`, `DependenciasCarga` → `DependenciasSincronizacion` (+ `DependenciasActualizacion` con `buscarTorneoActual`). Las pruebas de P1 pasaron igual antes y después del refactor. La función SQL conserva su nombre (`guardar_carga_inicial`) porque ya está en el proyecto real.
- Migración `20261102070648_actualizacion_diaria.sql`: agrega la columna (llena con `inicio` en los partidos ya cargados), reemplaza `guardar_carga_inicial` (`create or replace`; se repiten `revoke`/`grant`), activa `pg_cron` y `pg_net` y programa `actualizacion-diaria` con `net.http_post` (`apikey` desde Vault, `timeout_milliseconds = 60000`), como en la guía de Supabase. En la base local la tarea existe pero falla al correr porque Vault está vacío; no afecta.
- El "ahora" de R9 es `sincronizado_en` de la carga (lo manda el servidor), para poder probarlo con fechas fijas. Si la sincronización ocurre justo a la hora del cierre, ya cuenta como cerrado.
- Tipos: `cierre_predicciones` agregado a mano en los dos `tipos-db.ts`; se confirma con `npm run tipos` tras `db push`.
- Pruebas: 6 nuevas sin base (65 en total) — P2 con una consulta y sin `/teams`, torneo y equipos guardados, **CA8** (el nuevo horario llega a lo que se guarda), sin torneo actual, tope y `errors`; 5 nuevas contra la base (11 en total) — cierre igual a inicio, **R9 antes** (se mueve) y **después** (no se mueve), liguilla publicada después y la tarea en `cron.job` (`0 14 * * *`, activa, lee `clave_secreta` de Vault, sin clave escrita).
- **Las pruebas detectan fallas:** con el cierre siempre movido, la tarea a las 13:00 y P2 consultando `/teams`, fallan exactamente las 5 pruebas correspondientes; restaurado, todo pasa.
- F02 v1.2 (R9 y Q1 apuntan a D82/D83); nota de S2 sobre la hora marcada como reemplazada por D83.
- Tipos: tras `db push`, `npm run tipos` generó exactamente las líneas de `cierre_predicciones` agregadas a mano.
- **Despliegue (2026-11-02, Jesús):** secretos `url_proyecto` y `clave_secreta` en Vault (desde la pantalla de Vault, para que la clave no quede en el historial del SQL Editor); migración aplicada (aparece en remoto); `actualizacion-diaria` v1 y `carga-inicial` v2 desplegadas (`verify_jwt=false`; `carga-inicial` se volvió a desplegar porque cambió el código compartido).
- **Ejecución manual de P2 (verificada por Jesús):** `HTTP 200`, `EXITO`, 1 consulta, resumen 18/21/170 (**CA8** en el proyecto real: P2 corre sobre el torneo actual sin duplicar nada); los 170 partidos con `cierre_predicciones = inicio`; registro `ACTUALIZACION_DIARIA` · `EXITO` · 1 consulta · sin error; `cron.job`: `actualizacion-diaria` · `0 14 * * *` · activa.
- **Primera ejecución programada (verificada por Jesús):** `sincronizacion` registro 5, `ACTUALIZACION_DIARIA` · `EXITO` · 1 consulta · sin error, con inicio **2026-11-02 14:00:07 UTC** (06:00 en Tijuana, D83).

## T25 — Detección de finales P3 y datos del partido P4 (2026-11-02)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | **`partido.listo_para_calificar_en`** (null = P4 pendiente), que F05 usará para saber qué calificar. | ✅ OK (D84, 03-data-model v1.4). |
| 2 | **Ventanas**: P3 entre 115 min y 6 h después del inicio; P4 terminados de los últimos 3 días, máximo 5 por ejecución. | Jesús comentó que la cuota dejará de importar con el plan Pro; se conservan porque, sin ellas, al desplegar con el plan gratis P4 intentaría bajar los 170 partidos de 2024 (340 consultas) y agotaría la cuota ese día. ✅ OK (D85). |
| 3 | Tarea **cada 15 min** que solo llama a la función si hay pendientes (condición en `partidos_pendientes_de_final`, compartida con la función); sin pendientes no hay llamada ni registro. | ✅ OK (D85). |
| 4 | Cuerpo opcional **`{ "partidos": [...] }`** para forzar P4 (administrador), sin ventanas; sirve para verificar CA7 en el proyecto real y para bajar los datos de 2024 cuando haya plan Pro. | ✅ OK (D85). |
| 5 | Eventos `Goal`/`Card`/`subst`/`Var` → `GOL`/`TARJETA`/`CAMBIO`/`VAR` (desconocido se omite y se anota); eventos reemplazados en cada P4; estadísticas por (partido, equipo, tipo) como texto, null = sin dato; sin estadísticas también se marca listo. | ✅ OK (D85). |

**Ajustes al implementar:**
- Edge Function `detectar-finales` (clave secreta, `verify_jwt = false`). Primero P3 de los pendientes sin terminar (registro `DETECCION_FINALES`, `/fixtures?ids=` de 20 en 20), luego vuelve a pedir los pendientes y hace P4 de los terminados (un registro `DATOS_PARTIDO` por partido, `/fixtures/statistics` y `/fixtures/events`). Un partido con error en P4 no impide los demás. Responde 502 si alguna ejecución terminó en `ERROR`.
- Migración `20261102072849_detectar_finales.sql`: columna, `partidos_pendientes_de_final(ahora)` (excluye simulados), `actualizar_estados_partidos(datos)` (P3: estado y marcador; estado desconocido no cambia), `guardar_datos_partido(datos)` (P4; rechaza partidos que no existen o que no están `TERMINADO`) y la tarea `detectar-finales` (`*/15 * * * *`, `select net.http_post(...) where exists (...)`). Las tres funciones solo para `service_role`.
- P3 solo actualiza estado y marcador (no el horario; eso es de P2).
- **Núcleo común** `_shared/sincronizacion/ejecucion.ts` (`ejecutarConRegistro`): abre y cierra el registro, cuenta las consultas (el total del día se lee en la primera consulta), aplica R4/R5/R6 y convierte excepciones en `ERROR`; P1/P2 se pasaron a usarlo sin cambiar su comportamiento (sus 65 pruebas pasaron igual). Los errores de P4 llevan el prefijo `Partido <id>:`.
- Utilidades de las pruebas de base en `_shared/sincronizacion/pruebas-bd.ts` (conexión, transacción que se deshace, `llamar` a funciones `jsonb`), usadas por los dos `*.bd-test.ts`; `deno task test:bd` corre ambos.
- Tipos: columna y funciones agregadas a mano en los dos `tipos-db.ts`; se confirman con `npm run tipos` tras `db push`.
- Pruebas: 16 nuevas sin base (81 en total) — tipos de evento, armado con los ejemplos reales del 1206057 (36 estadísticas, `Red Cards` null, 15 eventos con el 45+1), evento desconocido, sin estadísticas, estados de P3, y la ejecución (sin pendientes, grupos de 20, P4 tras P3, máximo 5, error aislado, base que rechaza, partido que la API no devuelve, sin tope, modo forzado); 8 nuevas contra la base (19 en total) — **CA7**, repetir P4, partido no terminado o inexistente, P3, ventana de 6 h, ventana de 3 días y una sola vez, permisos y la tarea en `cron.job`.
- **Las pruebas detectan fallas:** con 9 cambios a propósito (ventanas de 12 h y 5 días, sin borrar eventos, estadísticas sin actualizar, sin revisar `TERMINADO`, 7 por ejecución, grupos de 25, null guardado como "0", `subst` como gol) fallan 5 pruebas de base y 5 sin base; restaurado, todo pasa.
- F02 v1.3 (filas de P3/P4).
- **Tarea cada 15 min en el proyecto real (verificada por Jesús, 2026-11-02):** en `cron.job_run_details` las corridas de las 19:00 a las 20:00 UTC salen `succeeded` con "0 rows": sin partidos pendientes (datos de 2024) la condición no llama a la función, sin gastar consultas ni dejar registros vacíos (D85).
- Tipos: tras `db push`, `npm run tipos` generó exactamente las líneas agregadas a mano.
- **Despliegue (2026-11-02, Jesús):** migración aplicada (aparece en remoto); `detectar-finales` v1, `actualizacion-diaria` v2 y `carga-inicial` v3 desplegadas (`verify_jwt=false`; las dos últimas de nuevo porque cambió el código compartido).
- **P4 forzado del 1206057 (verificado por Jesús):** `HTTP 200`, `EXITO`, 36 estadísticas y 15 eventos; en la base real, 36 estadísticas, `Red Cards` sin dato en ambos equipos, 15 eventos (3 goles) y el partido marcado como listo para calificar → **CA7**. Registro `DATOS_PARTIDO` · `EXITO` · 2 consultas · sin error. `cron.job`: `actualizacion-diaria` (`0 14 * * *`) y `detectar-finales` (`*/15 * * * *`), activas.

## T26 — Pantalla S02: partidos por jornada (2026-11-02)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Escudos con **`expo-image`** (B-R4): librería nativa → **development build nueva** (EAS). | ✅ OK (D86). |
| 2 | **Jornada actual** (Q4) calculada en el servidor con una función SQL `jornada_actual()` (D52). | ✅ OK (D86). |
| 3 | Aviso con datos previos con el formato de 05-ui §6 ("Sin conexión · datos de [hora]") en vez del texto de F02 B6. | ✅ OK (D86). |
| 4 | Caché **solo en memoria** (sin AsyncStorage); los "datos previos" son los cargados con la app abierta. | ✅ OK (D86). |
| 5 | Fechas y horas en `es-MX` con la zona del teléfono (a. m./p. m.); `?jornada=` es el `orden`, uno inválido abre la actual. | ✅ OK (D86). |

**Ajustes al implementar:**
- Migración `20261102074824_jornada_actual.sql`: `jornada_actual(ahora default now())` devuelve el `orden` (próximo partido no cancelado con inicio ≥ ahora del torneo actual; si no hay, la última jornada; null sin torneo actual). Con los permisos de quien llama; la ejecutan `authenticated` y `service_role`, no `anon`. Prueba pgTAP `supabase/tests/jornada_actual.test.sql` (9 casos: antes del torneo, a media jornada, partido que empieza justo ahora, jornada terminada, cancelado que no cuenta, torneo terminado, sin argumento, `anon` sin permiso).
- `expo-image` 57.0.5 con `npx expo install` (agregó su plugin a `app.json`). Es nativa: hay que **compilar una development build nueva** para probar S02 en el teléfono.
- Pantalla en `App/src/partidos/` (`PantallaPartidos`, `SelectorJornada`, `FilaPartido`, `datos.ts`, `agruparPorDia.ts`); la ruta `(partidos)/partidos.tsx` solo la exporta. Componentes genéricos nuevos de 05-ui §5–6 en `App/src/componentes/`: `BotonIcono` (flechas de texto hasta tener íconos SVG), `Esqueleto`, `EstadoPantalla` y `AvisoSinConexion`; formatos de fecha en `App/src/formato/fechas.ts`.
- La fila es de líneas, no tarjeta (U1): escudo y nombre corto de cada equipo, en el centro la hora o el marcador de 90 min en Teko si terminó (Q5; en juego nunca, aunque la API traiga goles, B-R3), y el estado en texto. Queda marcado en el código dónde entra el indicador de F03 y los puntos de F10.
- **Token nuevo `escudoLista` = 28** (05-ui v1.3): 05-ui no tenía tamaño para el escudo en listas y no se usan valores sueltos.
- Sin red, supabase-js no lanza: devuelve el error con `status` 0; así se distingue "sin conexión" de una falla del servidor (`ErrorDatos.sinConexion`). Mensajes sin datos: los de F01 §10 ("Sin conexión. Revisa tu internet e inténtalo de nuevo." / "No pudimos cargar los partidos. Inténtalo de nuevo.") con "Reintentar". Sin torneo actual se muestra el estado vacío de la jornada.
- La consulta de partidos usa un solo literal en el `select` para que supabase-js deduzca los tipos (con concatenación los pierde).
- El encabezado de día se arma por partes ("sáb 13 jul"): el formato completo de Intl cambia entre versiones ("sáb, 13 jul" en una, "sáb 13 de jul" en Node).
- `clienteConsultas` con **1 reintento** por defecto (en vez de 3), para que sin conexión el error aparezca en ~1 s y no en ~7 s.
- Pruebas (Jest): 9 de formato, agrupación por día con zona fija y elección de jornada; 6 de la capa de datos (filtros pedidos, `status` 0 = sin conexión, sin torneo, falla parcial); 15 de la pantalla con la app completa (jornada actual del servidor, CA9 agrupación y orden, marcador solo al terminar, jornada de ruta e inválida, tocar → S03, CA10 flechas y extremos, sin historial (D78), esqueletos, vacío, sin torneo, sin conexión con "Reintentar", falla del servidor, aviso con datos previos y su hora, deslizar para recargar). Se adaptaron `rutas.test.tsx` y `guardia.test.tsx`, que usaban los botones provisionales de S02. App: 128 pruebas.
- En las pruebas de pantalla la caché va sin temporizador de limpieza (`gcTime: Infinity`) y se vacía tras cada prueba: con el `gcTime` de 5 min, Jest no terminaba.
- **Las pruebas detectan fallas:** con 5 cambios a propósito (marcador en juego, flecha anterior siempre activa, sin aviso, sin ordenar por hora, sin jornada actual) fallan 12 pruebas; restaurado, todo pasa. Al hacerlo se reforzó la prueba de B-R3 (el partido en juego del ejemplo no traía goles).
- Quedan 2 avisos de React "not wrapped in act" que vienen de las actualizaciones internas de `SectionList`; no afectan los resultados.
- Migración aplicada en el proyecto real; los tipos regenerados coinciden con la firma agregada a mano.
- **Validada por Jesús (2026-11-02)** en su teléfono y en el emulador `Angosto_320dp`, con la development build nueva (con `expo-image`): **CA9** (agrupación por día, orden y hora local), **CA10** (anterior/siguiente y flechas deshabilitadas en los extremos) y **CA11** (modo avión con y sin datos previos, "Reintentar").

## T27 — Permisos de los datos de fútbol y revisión de secretos (2026-11-02)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | CA12 con **pgTAP** (`supabase/tests/`, `npm run test:db`), como T14. | ✅ OK. |
| 2 | CA13 con un **script repetible** `npm run revisar:secretos`: exporta el paquete real de la app, busca en él el valor real de la clave de API-Football (sin imprimirlo), claves secretas y rastros de API-Football, y busca la clave en los archivos versionados. | ✅ OK. |
| 3 | Límite anotado: no revisa el APK nativo (solo las variables `EXPO_PUBLIC_` llegan a la app y ninguna es secreta). | ✅ OK. |

**Ajustes al implementar:**
- `supabase/tests/datos_futbol_rls.test.sql` (45 pruebas): RLS activado en las 8 tablas; `authenticated` lee las 7 de fútbol (B-R2) y **no crea, modifica ni borra** en ninguna (CA12, error 42501); no lee ni escribe `sincronizacion`; no tiene permiso de ejecutar `guardar_carga_inicial`, `actualizar_estados_partidos`, `guardar_datos_partido` ni `partidos_pendientes_de_final`, y sí `jornada_actual`; `anon` no lee ninguna de las 8 (F01 V6); al final, una huella (md5) de las 8 tablas demuestra que nada cambió. 106 pruebas pgTAP en total.
- **Las pruebas detectan fallas:** con los permisos rotos a propósito en la base local (escritura de `authenticated` en partido, equipo y jornada; lectura de `sincronizacion`; `anon` leyendo liga; ejecución de `guardar_carga_inicial`; RLS desactivado en `evento_partido`) fallan 14 pruebas; tras `db reset`, pasan las 106. Al hacerlo se corrigió la prueba de las funciones, que pasaba aunque `authenticated` pudiera ejecutar `guardar_carga_inicial` (la tabla negaba el acceso de todos modos, como en T23); ahora revisa `has_function_privilege`.
- Revisión estática: la app solo usa `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY` y `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (`EXPO_ROUTER_IMPORT_MODE` solo en pruebas); `eas.json` no inyecta variables; el único `.env` versionado de la app es `.env.example`.
- `scripts/revisar-secretos.mjs` (Node, sin dependencias): exporta con `expo export --platform android --no-bytecode` a una carpeta temporal fuera del repo y la borra al terminar. **Control positivo:** la URL pública de Supabase debe aparecer en el paquete; si no, falla. Revisa también que `EXPO_PUBLIC_SUPABASE_KEY` sea `sb_publishable_…` (F01 CA9). Nunca imprime valores. Termina con código 1 si encuentra algo.
- **Falso positivo resuelto:** la primera versión revisaba el bytecode de Hermes y marcó una "clave secreta de Supabase". Se inspeccionó sin imprimir el valor: era `startsWith("sb_secret_")` de supabase-js, que en el bytecode queda pegado al texto siguiente (los textos van uno tras otro, sin comillas). Por eso se exporta sin bytecode: mismos textos, pero entre comillas.
- Se comprobó que el script sí detecta: con una copia temporal que buscaba un texto que está en la app, reportó el hallazgo en el paquete y en los archivos versionados.
- **Resultado (2026-11-02):** sin secretos — la clave de API-Football no está en el paquete ni versionada, no hay claves secretas ni llamadas a API-Football en la app, y la clave de Supabase de la app es la pública → **CA13** y **F01 CA9**.
- README: cómo correr la revisión de secretos.

## T30 — Cierre de la semana (2026-11-02)

| # | Propuesta | Respuesta de Jesús |
|---|---|---|
| 1 | Corrida completa de verificaciones (app, servidor, base local, pgTAP, secretos). | ✅ OK. |
| 2 | Lista de criterios de F01 y F02 con su evidencia; validar en el teléfono los que no tenían registro (F01 CA3, CA4, CA8) y repasar CA1, CA5, CA6 con la build de `expo-image`. | ✅ OK. |
| 3 | Con su aprobación: F01 y F02 "Terminada", tareas de S2 marcadas, D87. | ✅ OK. |
| 4 | Aviso: el plan semanal va atrasado (S2 era del 12 al 18 de octubre); replantearlo justo después de T30. | ✅ OK (siguiente paso). |

**Corrida completa (2026-11-02):** app — typecheck y lint sin errores, Jest 128/128; servidor — typecheck y lint sin errores, `deno task test` 81/81, `deno task test:bd` 19/19; pgTAP 106/106; `npm run revisar:secretos` sin hallazgos (151 archivos versionados).

**Criterios y evidencia:**

| Feature | Criterio | Evidencia |
|---|---|---|
| F01 | CA1, CA2, CA5, CA6 | Validados por Jesús en T12 (2026-10-24); CA1, CA5 y CA6 repasados en T30 con la build nueva |
| F01 | CA3, CA4, CA8 | Validados por Jesús en T30 (2026-11-02); CA8 también en `guardia.test.tsx` |
| F01 | CA7 | pgTAP `usuario_rls.test.sql` (T14) |
| F01 | CA9 | Revisión de secretos (T27) |
| F01 | CA10 | Typecheck estricto sin `any` |
| F02 | CA1, CA2 | Pruebas contra la base (T23) y carga real del Apertura 2024 dos veces |
| F02 | CA3, CA4, CA5 | Pruebas unitarias (T22) |
| F02 | CA6 | Esquemas y ejecución con dobles (T21, T23–T25) |
| F02 | CA7 | Pruebas contra la base (T25) y P4 forzado del 1206057 en el proyecto real |
| F02 | CA8 | Pruebas (T24), P2 manual y la ejecución programada de las 06:00 en el proyecto real |
| F02 | CA9, CA10, CA11 | Validados por Jesús en T26 (teléfono y emulador angosto) |
| F02 | CA12 | pgTAP `datos_futbol_rls.test.sql` (T27) |
| F02 | CA13 | Revisión de secretos (T27) |
| F02 | CA14 | Typecheck estricto sin `any` |

**Resultado:** Jesús aprobó F01 y F02 en su teléfono → **F01 y F02 terminadas, M1 Base terminado, S2 cerrada (D87)**. Pendiente heredado: P-26 (aviso del asesor de Supabase sobre `usuario_publico`, se revisa en F07).
