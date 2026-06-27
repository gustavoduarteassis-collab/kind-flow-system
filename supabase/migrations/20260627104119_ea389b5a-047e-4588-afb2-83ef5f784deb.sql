
CREATE TABLE public.store_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_role TEXT NOT NULL DEFAULT 'equipe',
  channel TEXT NOT NULL DEFAULT 'interno',
  message TEXT NOT NULL,
  attachment_url TEXT,
  pinned BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_store_communications_store ON public.store_communications(store_id, created_at DESC);
CREATE INDEX idx_store_communications_active ON public.store_communications(store_id) WHERE deleted_at IS NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_communications TO authenticated;
GRANT ALL ON public.store_communications TO service_role;

ALTER TABLE public.store_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authorized team can view store communications"
  ON public.store_communications FOR SELECT
  TO authenticated
  USING (public.is_authorized_team(auth.uid()) AND deleted_at IS NULL);

CREATE POLICY "Authorized team can insert store communications"
  ON public.store_communications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_authorized_team(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Authors can update own messages"
  ON public.store_communications FOR UPDATE
  TO authenticated
  USING (public.is_authorized_team(auth.uid()) AND user_id = auth.uid())
  WITH CHECK (public.is_authorized_team(auth.uid()) AND user_id = auth.uid());

CREATE POLICY "Authors can soft-delete own messages"
  ON public.store_communications FOR DELETE
  TO authenticated
  USING (public.is_authorized_team(auth.uid()) AND user_id = auth.uid());

CREATE TRIGGER update_store_communications_updated_at
  BEFORE UPDATE ON public.store_communications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
