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
