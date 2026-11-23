# Campeón de Sillón

App móvil de **predicciones de la Liga MX** con gamificación y **sin dinero real**. Predices resultados, justificas tu análisis (una IA lo evalúa), ganas puntos, rachas e insignias, y compites en grupos privados con tus amigos. Es una alternativa sin riesgo económico a las apps de apuestas para demostrar cuánto sabes de fútbol.

Proyecto Integral de Aplicaciones Móviles (UABC, 7.º semestre). Plataforma objetivo: Android (el código es multiplataforma, D53).

## Entregables

| Entregable | Dónde |
|---|---|
| APK para instalar | [Releases del repositorio](https://github.com/Jesus292005/AM_Proyecto-Integral_375865/releases) (`campeon-de-sillon.apk`) |
| Diario de decisiones | [`specs/decisions.md`](./specs/decisions.md): todas las decisiones del proyecto, con fecha y razón (D01–D117) |
| Bitácora de IA | [`specs/bitacora-ia.md`](./specs/bitacora-ia.md): qué le pedí a la IA, qué acepté, qué rechacé y en qué se equivocó |
| Especificaciones (SDD) | [`specs/`](./specs): proyecto, MVP, pantallas, modelo de datos, herramientas, guía visual, features y tareas |

> **¿Por qué APK y no Expo Snack?** Snack corre el código dentro de Expo Go, y la app usa librerías nativas que Expo Go no trae (inicio de sesión nativo de Google, notificaciones push remotas). Además, las variables de entorno no se versionan. En Snack la app no pasaría de la pantalla de inicio de sesión.

## Qué hace la app

- **Partidos:** jornadas de la Liga MX (Apertura 2026) con datos reales de API-Football, navegación por jornadas y filtro "Sin predecir".
- **Predicción:** resultado, rango de goles o marcador exacto, editable hasta el inicio del partido. Las predicciones de los demás solo se ven a partir de que empieza (lo aplica el servidor, D35).
- **Justificación evaluada con IA:** el análisis es opcional y nunca resta. Al terminar el partido, la IA lo compara con lo que pasó y da un bono de 0 a 100 con una explicación.
- **Puntos automáticos:** resultado 100, rango de goles 150, marcador exacto 350. Se califica solo, sin que nadie abra la app.
- **Grupos privados:** se crean con un código o un QR. Cada grupo tiene ranking del torneo y de la jornada, la figura de la jornada, un muro de análisis revelados con reacciones y quién falta por predecir.
- **Identidad y recompensas:** perfil con foto y nombre, equipo favorito, carta de jugador con atributos, rachas e insignias en la Vitrina.
- **Inicio:** pendientes con cuenta regresiva, el próximo partido de tu equipo, tu última jornada, el mejor análisis de tus grupos y tus grupos con tu posición.

**Funciones nativas:** inicio de sesión con Google, notificaciones push (recordatorio antes del cierre y aviso de puntos), cámara para escanear el QR, vibración al guardar, hoja nativa para compartir la invitación y almacenamiento seguro de la sesión.

## Cómo está construida

```
App (React Native + Expo)  ──lee y escribe──▶  Supabase (PostgreSQL + RLS + funciones)
   solo muestra datos                              │  tareas programadas (pg_cron)
                                                   ├──▶ API-Football (partidos y estadísticas)
                                                   └──▶ Claude Haiku (evaluación de análisis)
```

La app es **delgada** (D52): las reglas (puntos, cierre, visibilidad, rankings, insignias) viven en el servidor y las claves secretas nunca entran a la app (D14).

| Carpeta | Contenido |
|---|---|
| [`App/`](./App) | App móvil: React Native + Expo SDK 57, Expo Router, TanStack Query, TypeScript estricto. |
| [`supabase/`](./supabase) | Servidor: migraciones SQL (tablas, vistas, funciones y RLS), Edge Functions en TypeScript (Deno) y pruebas pgTAP. |
| [`specs/`](./specs) | Especificaciones de la metodología SDD, diario de decisiones y bitácora de IA. |

Detalle y justificación de cada herramienta en [`specs/04-tech-stack.md`](./specs/04-tech-stack.md).

## Mapa del código (dónde va cada cambio)

| Si quieres cambiar… | Archivo |
|---|---|
| Una pantalla (diseño, textos, orden) | `App/src/<sección>/Pantalla*.tsx`: `inicio/`, `partidos/`, `partido/` (detalle y predicción), `grupos/`, `perfil/`, `simulacion/` |
| La ruta de una pantalla | `App/src/app/` (Expo Router; cada archivo es una ruta y casi todos solo importan su `Pantalla*`; excepción: `login.tsx`) |
| El formulario de predicción | `App/src/partido/FormularioPrediccion.tsx` (límites en `App/src/partido/eleccion.ts`) |
| Inicio de sesión | `App/src/app/login.tsx` y `App/src/sesion/` |
| Colores, tamaños, espacios y fuentes | `App/src/tema/tokens.ts` (nada de valores sueltos, `specs/05-ui.md`) |
| Íconos | `App/src/componentes/Icono.tsx` |
| Componentes reutilizables (botón, campo de texto, etc.) | `App/src/componentes/` |
| Menú inferior | `App/src/componentes/MenuInferior.tsx` y `App/src/app/(protegidas)/(tabs)/_layout.tsx` |
| Cómo lee la app un dato del servidor | `App/src/<sección>/datos.ts` (validado con Zod) |
| Valores de puntos (100 / 150 / 350) | Tabla `valor_puntos` en la base (`supabase/migrations/20261105180000_calificacion.sql`); se cambian en el servidor, no en la app |
| Cómo se califica una predicción | `supabase/functions/_shared/calificacion/` |
| Prompt de la evaluación con IA | `supabase/functions/_shared/evaluacion-ia/prompt.ts` (versiones en `specs/prompts/`) |
| Colores y nombres cortos de los equipos | `supabase/functions/_shared/datos-equipos.ts` |
| Reglas de grupos, rankings, insignias y rachas | `supabase/migrations/*.sql` (una migración por cambio) |

> Los límites de texto (nombre de 3–20, grupo de 3–30, justificación de 500) se validan **en la app y en la base**. Para cambiar uno hay que tocar los dos lados; si solo cambias la app, el servidor rechaza el dato.

## Cómo probarla

**Instalar el APK:** descárgalo de [Releases](https://github.com/Jesus292005/AM_Proyecto-Integral_375865/releases) en un Android, permite "instalar apps de origen desconocido" y entra con una cuenta de Google.

**Desarrollo (cambios en vivo):** se usa el *development build* instalado en el teléfono más el servidor de desarrollo en la laptop (el inicio de sesión con Google no funciona en Expo Go).

```bash
cd App
npm install
cp .env.example .env    # llenar las 3 variables públicas (URL y clave pública de Supabase, ID web de Google)
npx expo start          # abre el development build y escanea el QR
```

Con el teléfono por USB, `adb reverse tcp:8081 tcp:8081` lo mantiene conectado a la laptop aunque se active el modo avión.

> El APK y el *development build* usan el mismo paquete (`mx.campeondesillon.app`): instalar uno reemplaza al otro.

**Compilar el APK** (EAS, perfil `preview`):

```bash
cd App
npx eas-cli build --platform android --profile preview   # o `eas build ...` si tienes la CLI instalada
```

El perfil `preview` usa el entorno **production** de EAS, que debe tener `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_KEY`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` y la variable de archivo `GOOGLE_SERVICES_JSON` (Firebase, para las notificaciones). Si falta la URL o la clave de Supabase, la app se cierra al abrir; sin el ID web de Google, falla el inicio de sesión.

**Partidos simulados para la demo (F09):** una cuenta con `rol = 'ADMIN'` (columna `usuario.rol`, se asigna en la base) ve "Simulación" en Perfil. Ahí "juega" un partido de 2024 como si fuera de hoy, lo inicia y lo termina, y la calificación corre igual que con uno real.

## Servidor (Supabase)

La CLI de Supabase está como dependencia de desarrollo en la raíz (versión fija); se usa con `npx supabase`.

```bash
npm install                     # en la raíz: instala la CLI
npx supabase login              # abre el navegador para autorizar la CLI
npx supabase link --project-ref <ref-del-proyecto>   # pide la contraseña de la base de datos
npx supabase secrets set --env-file supabase/functions/.env   # API_FOOTBALL_KEY y ANTHROPIC_API_KEY
npx supabase secrets list       # verifica (muestra solo un resumen, nunca el valor)
npx supabase db push            # aplica las migraciones pendientes
npm run tipos                   # regenera los tipos de la base para la app y el servidor
```

Para probar las funciones en local, copiar `supabase/functions/.env.example` como `supabase/functions/.env` y llenar los secretos.

## Verificación (tipos, lint y pruebas)

```bash
# App
cd App
npm run typecheck && npm run lint && npm test

# Servidor (requiere Deno 2)
cd supabase/functions
deno task typecheck && deno task lint && deno task test

# Contra la base LOCAL (requiere Docker Desktop), desde la raíz
npx supabase db start           # tras una migración nueva: npx supabase db reset --local
npm run test:db                 # pgTAP: RLS, permisos y reglas en SQL
cd supabase/functions && deno task test:bd   # funciones contra la base local
```

Al cerrar M8 (D116): app 588/588 · servidor 179/179 · bd 27/27 · pgTAP 644/644.

## Uso de IA

- **En el desarrollo:** Claude Code con metodología SDD. Las reglas de trabajo están en [`CLAUDE.md`](./CLAUDE.md): niveles de decisión, trabajo por lotes y verificaciones obligatorias. Hay un subagente revisor independiente ([`.claude/agents/revisor.md`](./.claude/agents/revisor.md)) que revisa cada lote, y los comandos [`/lote`](./.claude/commands/lote.md) y [`/specs-modulo`](./.claude/commands/specs-modulo.md). La IA propone e implementa; las decisiones de alcance, reglas y permisos las aprueba Jesús, y cada feature se da por terminada solo cuando él la prueba en su teléfono. El detalle está en la [bitácora de IA](./specs/bitacora-ia.md).
- **En el producto:** Claude Haiku 5.5 evalúa las justificaciones desde el servidor (F06). Las versiones del prompt y por qué cambiaron están en [`specs/prompts/`](./specs/prompts) y en D94–D95.

## Limitaciones conocidas

- Solo Android; iOS requiere cuenta de Apple Developer y "Iniciar sesión con Apple" (D53).
- No corre en Expo Go ni en Snack (ver Entregables).
- Solo orientación vertical (`app.json`).
- Si un resultado cambia después de calificado, no se recalcula (D47).
- Las actualizaciones por aire (EAS Update, D52) no están implementadas: un cambio requiere un APK nuevo.
- Datos de la temporada 2026 con el plan Pro de API-Football, pagado hasta el 21 de diciembre de 2026.

## Secretos

- Los archivos `.env` **nunca** se versionan; solo los `.env.example` sin valores.
- La app solo contiene la clave **pública** de Supabase. Las claves secretas (servicio de Supabase, API-Football, Anthropic) viven únicamente en el servidor como secretos de Supabase.
- `npm run revisar:secretos` exporta el paquete real de la app y busca en él, y en los archivos versionados, la clave de API-Football y claves secretas (F01 CA9, F02 CA13). Se corre antes de cada entrega.

## Especificaciones

Empieza por [`specs/00-project.md`](./specs/00-project.md) (problema y usuario), [`specs/01-mvp.md`](./specs/01-mvp.md) (alcance y estado) y [`specs/decisions.md`](./specs/decisions.md). Las tareas de cada semana están en [`specs/tasks/`](./specs/tasks).

## Créditos

- Íconos: trazos de [Lucide](https://lucide.dev) (licencia ISC, © Lucide Contributors), copiados al componente `Icono` de la app en lugar de instalar la librería (F22, D105).
