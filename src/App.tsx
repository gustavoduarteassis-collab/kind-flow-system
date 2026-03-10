import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Lojas from "./pages/Lojas";
import StoreDetail from "./pages/StoreDetail";
import StoreReport from "./pages/StoreReport";
import Auth from "./pages/Auth";
import Equipe from "./pages/Equipe";
import FranqueadoPortal from "./pages/FranqueadoPortal";
import Pipeline from "./pages/Pipeline";
import CustosGeral from "./pages/CustosGeral";
import NotFound from "./pages/NotFound";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();
  const [isFranqueado, setIsFranqueado] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user?.email) { setIsFranqueado(null); return; }
    const checkRole = async () => {
      try {
        // 1. Check if user is in authorized team emails
        const { data: authorizedTeam, error: authErr } = await supabase
          .from("authorized_team_emails")
          .select("id")
          .ilike("email", user.email!)
          .limit(1);

        if (authErr) console.error("authorized_team_emails error:", authErr);

        if (authorizedTeam && authorizedTeam.length > 0) {
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

        const isTeam = (ownedStores && ownedStores.length > 0) || (teamMembers && teamMembers.length > 0);

        if (isTeam) {
          setIsFranqueado(false);
          return;
        }

        // 3. Check franchisee access
        const { data: access } = await supabase
          .from("franchisee_access")
          .select("id")
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

  if (!user) {
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
