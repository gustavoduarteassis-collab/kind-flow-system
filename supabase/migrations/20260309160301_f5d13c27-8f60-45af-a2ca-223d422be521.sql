
-- Construction diary entries table
CREATE TABLE public.construction_diary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT NOT NULL DEFAULT '',
  weather TEXT DEFAULT '',
  workers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Diary photos table
CREATE TABLE public.diary_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diary_id UUID NOT NULL REFERENCES public.construction_diary(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.construction_diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diary_photos ENABLE ROW LEVEL SECURITY;

-- RLS policies for construction_diary
CREATE POLICY "Users manage own diary entries" ON public.construction_diary
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Franchisees view diary entries" ON public.construction_diary
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.franchisee_access
    WHERE franchisee_access.store_id = construction_diary.store_id
    AND lower(franchisee_access.franchisee_email) = lower(auth.email())
  ));

-- RLS policies for diary_photos
CREATE POLICY "Users manage own diary photos" ON public.diary_photos
  FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.construction_diary
    WHERE construction_diary.id = diary_photos.diary_id
    AND construction_diary.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.construction_diary
    WHERE construction_diary.id = diary_photos.diary_id
    AND construction_diary.user_id = auth.uid()
  ));

CREATE POLICY "Franchisees view diary photos" ON public.diary_photos
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.construction_diary
    JOIN public.franchisee_access ON franchisee_access.store_id = construction_diary.store_id
    WHERE construction_diary.id = diary_photos.diary_id
    AND lower(franchisee_access.franchisee_email) = lower(auth.email())
  ));

-- Storage bucket for diary photos
INSERT INTO storage.buckets (id, name, public) VALUES ('diary-photos', 'diary-photos', true);

-- Storage RLS
CREATE POLICY "Authenticated users upload diary photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'diary-photos');

CREATE POLICY "Anyone can view diary photos" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'diary-photos');

CREATE POLICY "Users delete own diary photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'diary-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Trigger for updated_at
CREATE TRIGGER update_construction_diary_updated_at
  BEFORE UPDATE ON public.construction_diary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
