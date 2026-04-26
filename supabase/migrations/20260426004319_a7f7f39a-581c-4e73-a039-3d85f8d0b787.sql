-- Add is_reforma column to stores table
ALTER TABLE public.stores 
ADD COLUMN IF NOT EXISTS is_reforma BOOLEAN DEFAULT false;

-- Update existing stores that are known to be reforms based on context
UPDATE public.stores 
SET is_reforma = true 
WHERE nome ILIKE '%Shopping Jardim Pamplona%' 
   OR nome ILIKE '%São Gotardo%' 
   OR nome ILIKE '%Carpina%' 
   OR nome ILIKE '%Shopping Interlagos%' 
   OR nome ILIKE '%Novo Cruzeiro%' 
   OR nome ILIKE '%Plaza Campos Gerais%' 
   OR nome ILIKE '%Shopping Piracicaba%';