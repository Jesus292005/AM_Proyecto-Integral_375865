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
