import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { indicador, meta, realizado, observacoes, contexto } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `Você é um consultor especialista em gestão de franquias e expansão de lojas (setor calçadista - Constance). 
Seu papel é analisar indicadores mensais de desempenho e gerar planos de ação estruturados.

Para cada análise, retorne um JSON com a seguinte estrutura:
{
  "analise": "Análise resumida do resultado",
  "planos": [
    {
      "causa": "Descrição da causa raiz identificada",
      "fenomeno": "Descrição do fenômeno observado",
      "acao": "Ação proposta para resolver",
      "como": "Como implementar a ação",
      "responsavel": "Gustavo",
      "prazo_dias": 30
    }
  ]
}

Gere entre 2 e 4 planos de ação por indicador. Seja específico e prático.`;

    const userPrompt = `Indicador: ${indicador}
Meta: ${meta}
Realizado: ${realizado}
Observações: ${observacoes || "Nenhuma"}
Contexto adicional: ${contexto || "Nenhum"}

Analise o resultado e gere planos de ação para melhorar o desempenho.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_action_plans",
              description: "Generate structured action plans based on indicator analysis",
              parameters: {
                type: "object",
                properties: {
                  analise: { type: "string", description: "Summary analysis of the result" },
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
                required: ["analise", "planos"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_action_plans" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (toolCall?.function?.arguments) {
      const result = JSON.parse(toolCall.function.arguments);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: try to parse content directly
    const content = data.choices?.[0]?.message?.content || "";
    return new Response(JSON.stringify({ analise: content, planos: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("agm-ai error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
