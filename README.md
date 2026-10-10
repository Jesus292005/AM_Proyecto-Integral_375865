# Campeón de Sillón

App móvil de **predicciones de la Liga MX** con gamificación y **sin dinero real**: predices resultados, justificas tu análisis, ganas puntos e insignias y compites en grupos con tus amigos.

Proyecto Integral de Aplicaciones Móviles (UABC, 7.º semestre). Plataforma objetivo: Android (el código es multiplataforma).

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`App/`](./App) | App móvil: React Native + Expo SDK 57, TypeScript estricto. |
| [`supabase/`](./supabase) | Servidor: migraciones SQL, políticas RLS y funciones (Edge Functions en TypeScript). Toda la lógica de negocio vive aquí. |
| [`specs/`](./specs) | Especificaciones (metodología SDD): proyecto, MVP, navegación, modelo de datos, herramientas, guía visual, decisiones, features y tareas por semana. |

## Tecnología

- **App:** React Native, Expo SDK 57, Expo Router, TanStack Query, Google Sign-In nativo.
- **Servidor:** Supabase (PostgreSQL, Auth con Google, Edge Functions, `pg_cron`).
- **Datos de fútbol:** API-Football (solo desde el servidor).

Detalle y justificación en [`specs/04-tech-stack.md`](./specs/04-tech-stack.md).

## Requisitos

- Node.js LTS y npm
- Un teléfono Android con el *development build* instalado (el inicio de sesión con Google no funciona en Expo Go)
- Supabase CLI (para el servidor)

## Cómo arrancar

```bash
cd App
npm install
cp .env.example .env   # llenar con la URL y la clave PÚBLICA de Supabase
npm start
```

Para probar las funciones del servidor en local, copiar `supabase/functions/.env.example` como `supabase/functions/.env` y llenar los secretos.

## Secretos

- Los archivos `.env` **nunca** se versionan; solo los `.env.example` sin valores.
- La app solo contiene la clave **pública** de Supabase. Las claves secretas (servicio de Supabase, API-Football, Anthropic) viven únicamente en el servidor como secretos de Supabase.

## Especificaciones

Empieza por [`specs/00-project.md`](./specs/00-project.md) y [`specs/decisions.md`](./specs/decisions.md). Las tareas de cada semana están en [`specs/tasks/`](./specs/tasks).
