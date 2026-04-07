import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is authenticated and authorized
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller } } = await supabaseClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isTeam } = await supabaseClient.rpc("is_authorized_team", { check_user_id: caller.id });
    if (!isTeam) {
      return new Response(JSON.stringify({ error: "Sem permissão" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all unconfirmed users that have franchisee_access
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const unconfirmed = allUsers?.users?.filter(u => !u.email_confirmed_at) || [];

    const results: Array<{email: string, status: string}> = [];

    for (const user of unconfirmed) {
      // Check if this user has franchisee access
      const { data: access } = await supabaseAdmin
        .from("franchisee_access")
        .select("id")
        .ilike("franchisee_email", user.email || "")
        .limit(1);

      if (access && access.length > 0) {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
        results.push({
          email: user.email || "",
          status: error ? `Erro: ${error.message}` : "Confirmado!",
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, confirmed: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
