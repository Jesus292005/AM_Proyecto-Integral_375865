-- T52 — Tarea programada de la calificación (F05 R8).

-- Cada minuto, pero solo llama a la función si hay partidos por calificar (patrón de D85): sin
-- ellos no hay llamada ni registro vacío. Mismos secretos de Vault (D83).
select cron.schedule(
  'calificar',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/calificar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from public.partidos_por_calificar(1));
  $$
);
