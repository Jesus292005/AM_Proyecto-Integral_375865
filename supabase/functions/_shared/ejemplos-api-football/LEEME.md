# Ejemplos reales de API-Football (T20)

Respuestas **reales** de API-Football (plan gratis, Liga MX = 262, temporada 2024) para probar sin conexión y sin gastar consultas los esquemas Zod (T21), las conversiones (T22) y las funciones de sincronización (T23–T25).

- **Descargadas:** 2026-10-31.
- **No se editan a mano.** Solo se formatearon con sangría de 2 espacios (el contenido es idéntico al recibido). Si una prueba necesita un caso que no existe en los datos reales, se construye en la prueba a partir de estos archivos.
- No contienen la clave de la API (verificado).

| Archivo | Consulta | Contenido |
|---|---|---|
| `fixtures-262-2024.json` | `/fixtures?league=262&season=2024` | 340 partidos: Apertura 2024 (153 de fase regular + 17 de liguilla) y Clausura 2025 (igual). Estados: 338 `FT`, 2 `PEN`. |
| `teams-262-2024.json` | `/teams?league=262&season=2024` | 18 equipos con su estadio. |
| `statistics-1206057.json` | `/fixtures/statistics?fixture=1206057` | Estadísticas de Puebla 2-1 Querétaro (D29); `Red Cards`, `expected_goals` y `goals_prevented` llegan en `null`. |
| `events-1206057.json` | `/fixtures/events?fixture=1206057` | 15 eventos del mismo partido (goles, tarjetas, cambios, VAR). |
| `error-temporada-2026.json` | `/fixtures?league=262&season=2026` | Respuesta con `errors` no vacío: el plan gratis no da acceso a 2026 (R6). |

## Lo que hay que saber de estos datos

- **`errors` cambia de tipo:** es `[]` (arreglo vacío) cuando no hay error y un objeto (`{"plan": "..."}`) cuando lo hay.
- **Rondas:** todas llevan el prefijo del torneo, también las de liguilla (`Apertura - Quarter-finals`, `Clausura - Reclasificacion`). El acento de "Reclasificación" solo aparece en el Apertura.
- **Penales:** los 2 partidos `PEN` (1315387 y 1372470, ambos de reclasificación) traen `extratime` en `0-0` (no `null`) y `goals` igual a `score.fulltime`. No hay partidos `AET` en la temporada.
- **Estadísticas:** `value` puede ser número, texto con `%` (`"49%"`) o `null` (sin dato, D29).

## Volver a descargarlas

Desde la raíz del repo, en PowerShell (la clave se lee de `supabase/functions/.env` y no queda en el historial):

```powershell
$k = ((Get-Content supabase/functions/.env | Select-String '^API_FOOTBALL_KEY=').Line -split '=', 2)[1].Trim(); $h = "x-apisports-key: $k"; $d = "supabase/functions/_shared/ejemplos-api-football"; $u = "https://v3.football.api-sports.io"
curl.exe -sS -H $h "$u/fixtures?league=262&season=2024" -o "$d/fixtures-262-2024.json"
curl.exe -sS -H $h "$u/teams?league=262&season=2024" -o "$d/teams-262-2024.json"
curl.exe -sS -H $h "$u/fixtures/statistics?fixture=1206057" -o "$d/statistics-1206057.json"
curl.exe -sS -H $h "$u/fixtures/events?fixture=1206057" -o "$d/events-1206057.json"
curl.exe -sS -H $h "$u/fixtures?league=262&season=2026" -o "$d/error-temporada-2026.json"
Remove-Variable k, h
```

Gasta 5 de las 100 consultas diarias. Después hay que volver a formatearlas con sangría de 2 espacios.
