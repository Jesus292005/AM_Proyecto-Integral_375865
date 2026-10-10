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
