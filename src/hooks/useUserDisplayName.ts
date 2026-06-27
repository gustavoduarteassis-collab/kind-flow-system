import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Returns full name from team_members (matching by email), with email fallback. */
export function useUserDisplayName(): { name: string; initials: string; email: string | null } {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!user?.email) { setName(""); return; }
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("name")
        .ilike("email", user.email!)
        .is("deleted_at", null)
        .maybeSingle();
      if (cancelled) return;
      setName(data?.name || "");
    })();
    return () => { cancelled = true; };
  }, [user?.email]);

  const display = name || user?.email || "";
  const initials = (name ? name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("") : (user?.email?.[0] || "?")).toUpperCase();
  return { name: display, initials, email: user?.email ?? null };
}
