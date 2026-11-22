-- T95 — Tarea programada de las insignias (F14 R3). Cada 15 min, en la base (sin función de
-- Supabase ni llamadas externas): `otorgar_insignias()` solo agrega lo que falte.
select cron.schedule(
  'otorgar-insignias',
  '*/15 * * * *',
  $$ select public.otorgar_insignias(); $$
);
