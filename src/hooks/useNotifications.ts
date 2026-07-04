import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type Notification = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  related_table: string | null;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
};

export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(30);
    // Client-side dedupe: keep the most recent per (type, title, related_id).
    const seen = new Set<string>();
    const unique: Notification[] = [];
    for (const n of (data as Notification[]) ?? []) {
      const key = `${n.type}|${n.title}|${n.related_table ?? ""}|${n.related_id ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      unique.push(n);
      if (unique.length >= 10) break;
    }
    setItems(unique);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notifications-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, load]);

  // Trigger overdue scan on login (client-side)
  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data: tm } = await supabase
        .from("team_members")
        .select("id")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      if (!tm) return;
      const { data: overdue } = await supabase
        .from("tasks")
        .select("id, title, due_date")
        .eq("assigned_to", tm.id)
        .lt("due_date", today)
        .neq("status", "concluida")
        .neq("status", "cancelada")
        .is("deleted_at", null);
      if (!overdue || overdue.length === 0) return;
      // De-dupe: check if a notification for this exact task today already exists
      const { data: existing } = await supabase
        .from("notifications")
        .select("related_id")
        .eq("user_id", user.id)
        .eq("type", "task_overdue")
        .gte("created_at", today + "T00:00:00")
        .is("deleted_at", null);
      const seen = new Set((existing ?? []).map((n: any) => n.related_id));
      const toInsert = overdue
        .filter((t: any) => !seen.has(t.id))
        .map((t: any) => ({
          user_id: user.id,
          type: "task_overdue",
          title: "Tarefa vencida",
          message: `Você tem uma tarefa vencida: ${t.title}`,
          link: `/equipe?tab=tarefas&task=${t.id}`,
          related_table: "tasks",
          related_id: t.id,
        }));
      if (toInsert.length > 0) {
        await supabase.from("notifications").insert(toInsert);
      }
    })();
  }, [user]);

  const unreadCount = items.filter((n) => !n.read_at).length;

  const markAllRead = async () => {
    await supabase.rpc("mark_all_notifications_read" as any);
    await load();
  };

  const markOneRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
  };

  return { items, unreadCount, loading, markAllRead, markOneRead, reload: load };
}
