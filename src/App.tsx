import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import Lojas from "./pages/Lojas";
import StoreDetail from "./pages/StoreDetail";
import StoreReport from "./pages/StoreReport";
import Auth from "./pages/Auth";
import Equipe from "./pages/Equipe";
import FranqueadoPortal from "./pages/FranqueadoPortal";
import Pipeline from "./pages/Pipeline";
import CustosGeral from "./pages/CustosGeral";
import Diversos from "./pages/Diversos";
import AGM from "./pages/AGM";
import CronogramaLojasProprias from "./pages/CronogramaLojasProprias";
import AcompanhamentoProcesso from "./pages/AcompanhamentoProcesso";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const [isFranqueado, setIsFranqueado] = useState<boolean | null>(null);
  const authHashParams = new URLSearchParams(location.hash.replace(/^#/, ""));
  const authFlowType = authHashParams.get("type");
  const isPasswordSetupFlow = authFlowType === "invite" || authFlowType === "recovery";

  useEffect(() => {
    if (!user?.email) { setIsFranqueado(null); return; }
    const checkRole = async () => {
      try {
        // 1. Check if user is in authorized team via RPC
        const { data: isTeam, error: authErr } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });

        if (authErr) console.error("is_authorized_team error:", authErr);

        if (isTeam) {
          setIsFranqueado(false);
          return;
        }

        // 2. Check if user owns stores or has team data
        const { data: ownedStores } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);

        const hasOwnData = (ownedStores && ownedStores.length > 0) || (teamMembers && teamMembers.length > 0);

        if (hasOwnData) {
          setIsFranqueado(false);
          return;
        }

        // 3. Check franchisee/construtor access
        const { data: access } = await supabase
          .from("franchisee_access")
          .select("id, access_type")
          .ilike("franchisee_email", user.email!)
          .limit(1);

        setIsFranqueado(access && access.length > 0);
      } catch (err) {
        console.error("checkRole error:", err);
        setIsFranqueado(false);
      }
    };
    checkRole();
  }, [user]);

  if (loading || (user && isFranqueado === null)) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  if (!user || isPasswordSetupFlow) {
    return (
      <Routes>
        <Route path="*" element={<Auth />} />
      </Routes>
    );
  }

  if (isFranqueado) {
    return (
      <Routes>
        <Route path="*" element={<FranqueadoPortal />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/lojas" element={<Lojas />} />
      <Route path="/loja/:id" element={<StoreDetail />} />
      <Route path="/loja/:id/relatorio" element={<StoreReport />} />
      <Route path="/equipe" element={<Equipe />} />
      <Route path="/pipeline" element={<Pipeline />} />
      <Route path="/custos-geral" element={<CustosGeral />} />
      <Route path="/diversos" element={<Diversos />} />
      <Route path="/agm" element={<AGM />} />
      <Route path="/cronograma-proprias" element={<CronogramaLojasProprias />} />
      <Route path="/acompanhamento-processo" element={<AcompanhamentoProcesso />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
