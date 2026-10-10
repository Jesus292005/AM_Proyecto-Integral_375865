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
