INSERT INTO public.pipeline_stores (user_id, filial, local, data_inauguracao, status_geral)
SELECT s.user_id, NULLIF(s.filial,''), s.nome, NULLIF(s.inauguracao,'')::date,
  'Inaugurada em ' || to_char(now(),'DD/MM/YYYY') || ' (auto: seed)'
FROM public.stores s
WHERE (s.nome ILIKE '%morrinhos%' OR s.nome ILIKE '%ibirapuera%')
  AND NOT EXISTS (
    SELECT 1 FROM public.pipeline_stores p
    WHERE (p.filial IS NOT NULL AND p.filial = s.filial)
       OR lower(p.local) = lower(s.nome)
  );