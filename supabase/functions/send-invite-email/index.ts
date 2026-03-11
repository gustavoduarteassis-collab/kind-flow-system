import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, storeName, accessType } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Try to invite the user - if they already exist, this will fail gracefully
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: {
        access_type: accessType || "franqueado",
        store_name: storeName || "",
        invited: true,
      },
      redirectTo: `${req.headers.get("origin") || "https://kind-flow-system.lovable.app"}/auth`,
    });

    if (error) {
      // User might already exist - that's OK
      if (error.message?.includes("already been registered") || error.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ success: true, message: "Usuário já cadastrado, acesso liberado." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw error;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Convite enviado com sucesso!" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
