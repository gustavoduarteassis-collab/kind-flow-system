// Testes automatizados: garantir que funções SECURITY DEFINER
// NÃO sejam executáveis por `anon` e que continuem acessíveis
// pelos clientes autenticados whitelisted.
//
// Rode com: supabase--test_edge_functions { functions: ["security-tests"] }
//
// Ambiente esperado:
//   SUPABASE_URL              (auto)
//   SUPABASE_ANON_KEY         (auto)
//   TEST_AUTHORIZED_JWT       (opcional) — JWT de um usuário whitelisted.
//                              Se ausente, os testes "authenticated" são skipados.

import { assert, assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// URL e anon key são públicos (publishable) — seguro no repositório.
const SUPABASE_URL =
  Deno.env.get("SUPABASE_URL") ?? "https://fcqqrczztnaxdzcwjhtl.supabase.co";
const ANON_KEY =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjcXFyY3p6dG5heGR6Y3dqaHRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNTE0MjksImV4cCI6MjA4ODYyNzQyOX0.RyVDk7Fb1zWyDxOtp3K2JIrpvWTfIQ-bg3OO1U2W9Z0";
const AUTH_JWT = Deno.env.get("TEST_AUTHORIZED_JWT") ?? "";

// As 5 funções SECURITY DEFINER app-facing que devem existir e estar protegidas.
// Para cada uma: args mínimos e se anon deve ser BLOQUEADO (esperado: sempre true).
const FUNCTIONS: Array<{
  name: string;
  args: Record<string, unknown>;
  // Se a função é chamável por qualquer authenticated (true) ou só whitelisted (false)
  authenticatedOnlyIfWhitelisted: boolean;
}> = [
  { name: "is_authorized_team", args: { check_user_id: "00000000-0000-0000-0000-000000000000" }, authenticatedOnlyIfWhitelisted: false },
  { name: "current_actor_name", args: {}, authenticatedOnlyIfWhitelisted: false },
  { name: "mark_all_notifications_read", args: {}, authenticatedOnlyIfWhitelisted: false },
  { name: "list_soft_deleted", args: { _table: "tasks" }, authenticatedOnlyIfWhitelisted: true },
  { name: "soft_restore", args: { _table: "tasks", _id: "00000000-0000-0000-0000-000000000000" }, authenticatedOnlyIfWhitelisted: true },
];

async function rpc(fnName: string, args: Record<string, unknown>, jwt: string | null) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: ANON_KEY,
  };
  if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(args),
  });
  const text = await res.text();
  return { status: res.status, body: text };
}

// ---------------------------------------------------------------------------
// BLOCO 1 — anon deve ser BLOQUEADO em todas as 5 funções.
// ---------------------------------------------------------------------------
for (const fn of FUNCTIONS) {
  Deno.test(`SECURITY: anon NÃO pode executar ${fn.name}`, async () => {
    assert(SUPABASE_URL && ANON_KEY, "SUPABASE_URL/ANON_KEY ausentes no ambiente de teste");
    // anon = envia apenas apikey, sem Authorization Bearer diferente
    const { status, body } = await rpc(fn.name, fn.args, ANON_KEY);
    // Esperado: 401/403/404 OU corpo com "permission denied" / "Não autenticado"
    const blocked =
      status === 401 ||
      status === 403 ||
      status === 404 ||
      /permission denied|not authorized|não autoriz|não autentic|not authenticated/i.test(body);
    assert(
      blocked,
      `Esperado bloqueio para anon em ${fn.name}, recebi status=${status} body=${body.slice(0, 200)}`,
    );
  });
}

// ---------------------------------------------------------------------------
// BLOCO 2 — authenticated whitelisted deve conseguir executar.
//           Só roda se TEST_AUTHORIZED_JWT estiver presente.
// ---------------------------------------------------------------------------
for (const fn of FUNCTIONS) {
  Deno.test({
    name: `SECURITY: authenticated whitelisted PODE executar ${fn.name}`,
    ignore: !AUTH_JWT,
    fn: async () => {
      const { status, body } = await rpc(fn.name, fn.args, AUTH_JWT);
      // Aceitamos 200 (ok) ou 400 (validação de args) — o que NÃO pode
      // acontecer é 401/403/permission denied.
      const forbidden =
        status === 401 ||
        status === 403 ||
        /permission denied|not authorized/i.test(body);
      assert(
        !forbidden,
        `Whitelisted deveria acessar ${fn.name}, recebi status=${status} body=${body.slice(0, 200)}`,
      );
      // Para list_soft_deleted/soft_restore, se NÃO for whitelisted o app
      // devolve "Não autorizado" — sinaliza que o JWT usado não está na allowlist.
      if (fn.authenticatedOnlyIfWhitelisted && /não autoriz/i.test(body)) {
        throw new Error(
          `JWT de teste não está na authorized_team_emails — ${fn.name} retornou "Não autorizado".`,
        );
      }
      assertEquals(typeof status, "number");
    },
  });
}
