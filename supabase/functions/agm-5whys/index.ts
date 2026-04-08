import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { messages, indicador, meta, realizado, mode } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = mode === "generate_plan"
      ? `Você é um consultor especialista em gestão de franquias (Constance Calçados - setor de expansão).
Com base na conversa de 5 Porquês abaixo, extraia a causa raiz identificada e gere planos de ação estruturados.
Retorne usando a tool generate_action_plans.`
      : `Você é um consultor especialista em gestão de franquias e expansão de lojas (Constance Calçados).
Seu papel é conduzir uma análise de causa raiz usando a metodologia dos 5 Porquês (5 Whys).

Contexto do indicador:
- Indicador: ${indicador}
- Meta: ${meta}
- Realizado: ${realizado}

REGRAS IMPORTANTES:
1. O usuário vai explicar o que ele acha que causou o resultado. 
2. Você deve perguntar "Por quê?" de forma inteligente para aprofundar a análise.
3. A cada resposta do usuário, avalie se já chegamos na causa raiz ou se precisa ir mais fundo.
4. Numere cada "porquê" (1º Porquê, 2º Porquê, etc).
5. Quando identificar a causa raiz (geralmente entre 3-5 porquês), diga claramente: "✅ Causa raiz identificada:" e resuma.
6. Seja direto, prático e específico ao setor de expansão de franquias.
7. Responda sempre em português do Brasil.
8. NÃO gere planos de ação ainda - apenas conduza a análise dos 5 Porquês.`;

    const body: any = {
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages,
      ],
    };

    if (mode === "generate_plan") {
      body.tools = [
        {
          type: "function",
          function: {
            name: "generate_action_plans",
            description: "Generate structured action plans based on 5 Whys root cause analysis",
            parameters: {
              type: "object",
              properties: {
                causa_raiz: { type: "string", description: "The root cause identified through 5 Whys" },
                planos: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      causa: { type: "string" },
                      fenomeno: { type: "string" },
                      acao: { type: "string" },
                      como: { type: "string" },
                      responsavel: { type: "string" },
                      prazo_dias: { type: "number" },
                    },
                    required: ["causa", "fenomeno", "acao", "como", "responsavel", "prazo_dias"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["causa_raiz", "planos"],
              additionalProperties: false,
            },
          },
        },
      ];
      body.tool_choice = { type: "function", function: { name: "generate_action_plans" } };
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();

    if (mode === "generate_plan") {
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall?.function?.arguments) {
        const result = JSON.parse(toolCall.function.arguments);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ causa_raiz: "", planos: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ reply: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agm-5whys error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
