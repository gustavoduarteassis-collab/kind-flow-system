
-- Create stores table
CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome text NOT NULL,
  filial text NOT NULL DEFAULT '',
  franqueado text NOT NULL DEFAULT '',
  construtor text NOT NULL DEFAULT '',
  analista_obra text NOT NULL DEFAULT '',
  inauguracao text NOT NULL DEFAULT '',
  checklist jsonb NOT NULL DEFAULT '{}',
  cronograma jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- Team members can manage their own stores
CREATE POLICY "Team manages own stores"
ON public.stores FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create franchisee_access table
CREATE TABLE public.franchisee_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE NOT NULL,
  franchisee_email text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(store_id, franchisee_email)
);

ALTER TABLE public.franchisee_access ENABLE ROW LEVEL SECURITY;

-- Team manages franchisee access
CREATE POLICY "Team manages franchisee access"
ON public.franchisee_access FOR ALL TO authenticated
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);

-- Franchisees can see their own access records
CREATE POLICY "Franchisees see own access"
ON public.franchisee_access FOR SELECT TO authenticated
USING (lower(franchisee_email) = lower(auth.email()));

-- Franchisees can read and update stores they have access to
CREATE POLICY "Franchisees access their stores"
ON public.stores FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.franchisee_access
    WHERE store_id = stores.id
    AND lower(franchisee_email) = lower(auth.email())
  )
);

CREATE POLICY "Franchisees update their stores"
ON public.stores FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.franchisee_access
    WHERE store_id = stores.id
    AND lower(franchisee_email) = lower(auth.email())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.franchisee_access
    WHERE store_id = stores.id
    AND lower(franchisee_email) = lower(auth.email())
  )
);

-- Update trigger for stores
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
