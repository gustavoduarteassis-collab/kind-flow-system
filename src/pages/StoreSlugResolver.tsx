import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

/** Resolves /lojas/:slug -> /loja/:id by matching id, filial, or slugified name. */
function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export default function StoreSlugResolver() {
  const { slug = "" } = useParams();
  const [resolved, setResolved] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // 1) Try as UUID
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug)) {
        if (!cancelled) setResolved(slug);
        return;
      }
      // 2) Fetch all and match
      const { data } = await supabase.from("stores").select("id, nome, filial");
      if (cancelled) return;
      const target = slug.toLowerCase();
      const found = (data || []).find((s: any) => {
        const filial = (s.filial || "").toLowerCase();
        const fullSlug = slugify(`${s.nome || ""} ${s.filial || ""}`);
        return filial === target
          || target === slugify(s.nome || "")
          || target === fullSlug
          || fullSlug.endsWith(target)
          || target.endsWith(`-${filial}`);
      });
      setResolved(found?.id || null);
    })();
    return () => { cancelled = true; };
  }, [slug]);

  if (resolved === undefined) return <div className="p-8 text-muted-foreground">Buscando loja...</div>;
  if (!resolved) return <Navigate to="/lojas" replace />;
  return <Navigate to={`/loja/${resolved}`} replace />;
}
