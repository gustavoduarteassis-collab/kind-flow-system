import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useIsAuthorized() {
  const { user } = useAuth();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setIsAuthorized(false); setLoading(false); return; }
    let active = true;
    supabase
      .rpc("is_authorized_team", { check_user_id: user.id })
      .then(({ data }) => {
        if (!active) return;
        setIsAuthorized(Boolean(data));
        setLoading(false);
      });
    return () => { active = false; };
  }, [user]);

  return { isAuthorized, loading };
}
