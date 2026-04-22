
-- 1) Realtime channel authorization: only authorized team can subscribe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- drop if exists then create
    EXECUTE 'DROP POLICY IF EXISTS "Authorized team can read realtime messages" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Authorized team can read realtime messages"
      ON realtime.messages FOR SELECT TO authenticated
      USING (public.is_authorized_team(auth.uid()))
    $POL$;

    EXECUTE 'DROP POLICY IF EXISTS "Authorized team can send realtime messages" ON realtime.messages';
    EXECUTE $POL$
      CREATE POLICY "Authorized team can send realtime messages"
      ON realtime.messages FOR INSERT TO authenticated
      WITH CHECK (public.is_authorized_team(auth.uid()))
    $POL$;
  END IF;
END$$;

-- 2) Restrict listing of public buckets to authenticated users only.
-- Public URL access via storage.objects continues to work via Supabase's public bucket signed/public-URL endpoints.
DROP POLICY IF EXISTS "Authenticated can list public photo buckets" ON storage.objects;
CREATE POLICY "Authenticated can list public photo buckets"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('propostas','inaug-checklist-photos','visita-tecnica-photos'));

-- Remove any anon SELECT policies that allow listing across these buckets if they exist
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT polname FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='storage' AND c.relname='objects'
      AND polname ILIKE '%public%select%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END$$;
