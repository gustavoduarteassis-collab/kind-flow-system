import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Returns full name from team_members (matching by email). Never returns raw email —
 *  falls back to first name part before "@" so the greeting is never something like
 *  "gustavo@constance.com.br". `loading` is true until the name is resolved. */
export function useUserDisplayName(): {
  name: string;
  initials: string;
  email: string | null;
  loading: boolean;
} {
  const { user } = useAuth();
  const [name, setName] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    if (!user?.email) {
      setName("");
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("name")
        .ilike("email", user.email!)
        .is("deleted_at", null)
        .maybeSingle();
      if (cancelled) return;
      setName(data?.name || "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  // Fallback: use the part before "@" of the email, capitalized. Never the raw email.
  const emailPrefix = user?.email ? user.email.split("@")[0].replace(/[._-]+/g, " ") : "";
  const cap = (s: string) =>
    s
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0].toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  const display = name || cap(emailPrefix);
  const initials = (display
    ? display
        .split(/\s+/)
        .map((p) => p[0])
        .slice(0, 2)
        .join("")
    : "?"
  ).toUpperCase();
  return { name: display, initials, email: user?.email ?? null, loading };
}
