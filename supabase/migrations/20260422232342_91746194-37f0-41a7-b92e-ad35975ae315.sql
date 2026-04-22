
UPDATE public.custos_geral_entries
SET created_at = '2026-02-15 12:00:00+00'
WHERE id IN (
  'cb0d52fd-33e8-43e3-b4af-50196733df85', -- São Gotardo
  'b9604b63-7505-48b4-a80a-befd42e8bff6'  -- Jardim Pamplona
);

UPDATE public.custos_geral_entries
SET created_at = '2026-03-15 12:00:00+00'
WHERE id IN (
  '93a95809-d8cb-4d6d-8728-523b92f1424e', -- Shopping Interlagos
  'e3ae81d3-ee6c-47b4-9033-996a363cd446'  -- Carpina
);
