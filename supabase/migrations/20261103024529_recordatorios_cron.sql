-- T42 — Tarea programada de recordatorios (F11a R7).


-- Solo llama a la función si hay pendientes (patrón de D85). Mismos secretos de Vault (D83).
select cron.schedule(
  'recordatorios',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/recordatorios',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  )
  where exists (select 1 from public.recordatorios_pendientes(now()));
  $$
);
