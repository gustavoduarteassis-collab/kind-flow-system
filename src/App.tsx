import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import LojasUnificadas from "./pages/LojasUnificadas";
import StoreDetail from "./pages/StoreDetail";
import StoreReport from "./pages/StoreReport";
import StoreSlugResolver from "./pages/StoreSlugResolver";
import Auth from "./pages/Auth";
import Equipe from "./pages/Equipe";
import FranqueadoPortal from "./pages/FranqueadoPortal";

import ImportFunil from "./pages/ImportFunil";
import CustosGeral from "./pages/CustosGeral";
import Diversos from "./pages/Diversos";
import AGM from "./pages/AGM";
import Acessos from "./pages/Acessos";
import ItensExcluidos from "./pages/ItensExcluidos";
import Performance from "./pages/Performance";
import ValidacaoDatas from "./pages/ValidacaoDatas";
import MatrizEtapas from "./pages/MatrizEtapas";
import NotFound from "./pages/NotFound";
import AppLayout from "./components/layout/AppLayout";
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
        const { data: isTeam, error: authErr } = await supabase.rpc("is_authorized_team", { check_user_id: user.id });
        if (authErr) console.error("is_authorized_team error:", authErr);
        if (isTeam) { setIsFranqueado(false); return; }

        const { data: ownedStores } = await supabase.from("stores").select("id").eq("user_id", user.id).is("deleted_at", null).limit(1);
        const { data: teamMembers } = await supabase.from("team_members").select("id").eq("user_id", user.id).is("deleted_at", null).limit(1);
        const hasOwnData = (ownedStores && ownedStores.length > 0) || (teamMembers && teamMembers.length > 0);
        if (hasOwnData) { setIsFranqueado(false); return; }

        const { data: access } = await supabase.from("franchisee_access").select("id, access_type").ilike("franchisee_email", user.email!).is("deleted_at", null).limit(1);
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
    return <Routes><Route path="*" element={<Auth />} /></Routes>;
  }

  if (isFranqueado) {
    return <Routes><Route path="*" element={<FranqueadoPortal />} /></Routes>;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Index />} />
        <Route path="/lojas" element={<LojasUnificadas />} />
        <Route path="/lojas/:slug" element={<StoreSlugResolver />} />
        <Route path="/loja/:id" element={<StoreDetail />} />
        <Route path="/loja/:id/relatorio" element={<StoreReport />} />
        <Route path="/equipe" element={<Equipe />} />
        <Route path="/pipeline" element={<Navigate to="/lojas?tab=funil" replace />} />
        <Route path="/funil" element={<Navigate to="/lojas?tab=funil" replace />} />
        <Route path="/funil-importar" element={<ImportFunil />} />
        <Route path="/custos-geral" element={<CustosGeral />} />
        <Route path="/custos" element={<Navigate to="/custos-geral" replace />} />
        <Route path="/diversos" element={<Diversos />} />
        <Route path="/agm" element={<AGM />} />
        <Route path="/acessos" element={<Acessos />} />
        <Route path="/itens-excluidos" element={<ItensExcluidos />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/validacao-datas" element={<ValidacaoDatas />} />
        <Route path="/matriz-etapas" element={<MatrizEtapas />} />
        <Route path="*" element={<NotFound />} />
      </Route>
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
