-- Remover policy permissiva criada na migration anterior (anulava a restrição)
DROP POLICY IF EXISTS "Authenticated can view pipeline non-sensitive" ON public.pipeline_stores;