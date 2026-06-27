// Daily notification generator. Called by pg_cron at 8h and 17h (BRT = 11h/20h UTC).
// Generates: task_due_today (at "morning" run) and habit_pending (at "afternoon" run).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: { mode?: "morning" | "afternoon" } = {};
  try { body = await req.json(); } catch { /* empty body ok */ }
  const mode = body.mode ?? "morning";

  const today = new Date().toISOString().slice(0, 10);
  const startOfDay = today + "T00:00:00";
  let inserted = 0;

  try {
    if (mode === "morning") {
      // Tasks due today, not completed, not yet notified today
      const { data: tasks } = await supabase
        .from("tasks")
        .select("id, title, assigned_to, team_members:assigned_to(user_id)")
        .eq("due_date", today)
        .neq("status", "concluida")
        .neq("status", "cancelada")
        .is("deleted_at", null);

      for (const t of tasks ?? []) {
        const userId = (t as any).team_members?.user_id;
        if (!userId) continue;

        const { data: dupe } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", userId)
          .eq("type", "task_due_today")
          .eq("related_id", t.id)
          .gte("created_at", startOfDay)
          .is("deleted_at", null)
          .maybeSingle();
        if (dupe) continue;

        await supabase.from("notifications").insert({
          user_id: userId,
          type: "task_due_today",
          title: "Tarefa vence hoje",
          message: `Tarefa vence hoje: ${t.title}`,
          link: `/equipe?tab=tarefas&task=${t.id}`,
          related_table: "tasks",
          related_id: t.id,
        });
        inserted++;
      }
    } else {
      // Habits not yet completed today
      const { data: habits } = await supabase
        .from("habits")
        .select("id, name, assigned_to_members")
        .is("deleted_at", null);

      for (const h of habits ?? []) {
        const memberIds: string[] = (h as any).assigned_to_members ?? [];
        if (!memberIds.length) continue;

        const { data: completions } = await supabase
          .from("habit_completions")
          .select("team_member_id")
          .eq("habit_id", h.id)
          .eq("completion_date", today)
          .eq("completed", true)
          .is("deleted_at", null);
        const doneSet = new Set((completions ?? []).map((c: any) => c.team_member_id));

        const pendingMembers = memberIds.filter((id) => !doneSet.has(id));
        if (!pendingMembers.length) continue;

        const { data: tms } = await supabase
          .from("team_members")
          .select("id, user_id")
          .in("id", pendingMembers)
          .is("deleted_at", null);

        for (const tm of tms ?? []) {
          if (!tm.user_id) continue;
          const { data: dupe } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", tm.user_id)
            .eq("type", "habit_pending")
            .eq("related_id", h.id)
            .gte("created_at", startOfDay)
            .is("deleted_at", null)
            .maybeSingle();
          if (dupe) continue;
          await supabase.from("notifications").insert({
            user_id: tm.user_id,
            type: "habit_pending",
            title: "Hábito pendente",
            message: `Hábito pendente: ${h.name} — você ainda não marcou hoje`,
            link: "/equipe?tab=habitos",
            related_table: "habits",
            related_id: h.id,
          });
          inserted++;
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, mode, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
