import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o assistente da AGM mensal de Implantação & Obras da Constance Calçados, atendendo Gustavo Duarte.

A AGM tem estas 11 seções:
1. Capa
2. Ata dos planos de ação do mês anterior (status, o que falta, novo prazo)
3. Matriz de Resultados (OTIF ≥ 90%, Custo/m², Prazo médio, Checklist Store-Ready, Novos fornecedores)
4. Abertura de novas lojas (Filial | Loja | Inauguração prevista | Realizada | Status)
5. Custo/m² previsto vs realizado por categoria (Mão de obra, Móveis, Piso, Iluminação, Informática, Demais)
6. Análise de causa raiz — Custo (Fenômeno, Causa, Plano de ação)
7. Prazo médio (separado por construtoras e junta junta)
8. Análise de causa raiz — Prazo (linha do tempo, fenômeno, causa, plano)
9. Novos fornecedores (Nome, Serviço, Loja, Avaliação)
10. Pendências de checklist (inicial e final)
11. Ações de melhoria (Arquitetura, Implantação, Marcenaria/Fornecedores)

Regras de farol dos planos:
- 🟢 No prazo ou concluído
- 🟡 Próximo do prazo ou em risco
- 🔴 Atrasado ou sem atualização há mais de 30 dias

Você recebe abaixo um BLOCO DE CONTEXTO com os dados reais do mês (lojas, custos, prazos, planos abertos). Use esses dados nas suas respostas — não invente números.

Ao responder:
- Identifique o que faltou informar e faça perguntas objetivas.
- Monte o texto pronto para cada slide quando solicitado (use markdown e tabelas).
- Sugira planos de ação novos no formato: Causa | Ação | Como | Responsável | Prazo Inicial | Prazo Final | Farol.
- Sempre destaque planos atrasados ou sem atualização recente.
- Use português do Brasil, tom executivo direto.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Unauthorized");

    const { messages, contexto } = await req.json();
    if (!Array.isArray(messages)) throw new Error("messages array required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const contextBlock = contexto
      ? `\n\n=== BLOCO DE CONTEXTO (dados reais do mês) ===\n${contexto}\n=== FIM DO CONTEXTO ===\n`
      : "";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + contextBlock },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos ao workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("agm-assistant error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
