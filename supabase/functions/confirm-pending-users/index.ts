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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get all unconfirmed users that have franchisee_access
    const { data: allUsers } = await supabaseAdmin.auth.admin.listUsers();
    const unconfirmed = allUsers?.users?.filter(u => !u.email_confirmed_at) || [];

    const results: Array<{email: string, status: string}> = [];

    for (const user of unconfirmed) {
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
