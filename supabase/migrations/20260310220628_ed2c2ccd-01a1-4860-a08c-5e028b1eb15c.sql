
CREATE TABLE public.authorized_team_emails (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.authorized_team_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view" ON public.authorized_team_emails
FOR SELECT TO authenticated USING (true);

INSERT INTO public.authorized_team_emails (email, name) VALUES
('deisemedeiros@constance.com.br', 'Deise Mara Martins de Medeiros'),
('thainaraaraujo@constance.com.br', 'Thainara Nascimento de Oliveira F. A.'),
('gizeliagomide@constance.com.br', 'Gizelia Gomide'),
('gustavo@constance.com.br', 'Gustavo Duarte de Assis');
