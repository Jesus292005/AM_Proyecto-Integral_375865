-- T55 — Tarea programada de la evaluación con IA (F06 R14).

-- Cada minuto, pero solo llama a la función si hay evaluaciones por hacer y queda tope diario
-- (150 llamadas, R10; patrón de D85). Mismos secretos de Vault (D83). La espera es mayor que la de
-- `calificar`: hasta 5 llamadas a la IA por ejecución.
select cron.schedule(
  'evaluar',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'url_proyecto')
      || '/functions/v1/evaluar',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'clave_secreta')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 150000
  )
  where public.hay_evaluaciones_por_hacer(now(), 150);
  $$
);
