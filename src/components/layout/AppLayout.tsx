import { useEffect, useState } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { Button } from "@/components/ui/button";
import { LogOut, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const labelMap: Record<string, string> = {
  "": "Painel",
  pipeline: "Funil de Lojas",
  lojas: "Lojas",
  loja: "Lojas",
  "custos-geral": "Custos Geral",
  agm: "AGM",
  equipe: "Equipe & Tarefas",
  diversos: "Diversos",
  acessos: "Acessos",
  "funil-importar": "Importar Funil",
  relatorio: "Relatório",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Cache so we don't refetch the same store name on every render. */
const storeNameCache = new Map<string, string>();

function useStoreNameForPath() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  // Match /loja/:id
  const id = parts[0] === "loja" && parts[1] && UUID_RE.test(parts[1]) ? parts[1] : null;
  const [name, setName] = useState<string | null>(id ? storeNameCache.get(id) || null : null);

  useEffect(() => {
    if (!id) { setName(null); return; }
    const cached = storeNameCache.get(id);
    if (cached) { setName(cached); return; }
    let active = true;
    supabase.from("stores").select("nome").eq("id", id).maybeSingle().then(({ data }) => {
      if (!active || !data?.nome) return;
      storeNameCache.set(id, data.nome);
      setName(data.nome);
    });
    return () => { active = false; };
  }, [id]);

  return { id, name };
}

function Breadcrumbs() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);
  const { id: storeId, name: storeName } = useStoreNameForPath();
  if (parts.length === 0) return null;
  const crumbs = parts.map((p, i) => {
    const href = "/" + parts.slice(0, i + 1).join("/");
    let label = labelMap[p] || decodeURIComponent(p);
    // Replace UUID segment in /loja/:id with the store name
    if (storeId && p === storeId) label = storeName || "Carregando…";
    return { href, label };
  });
  return (
    <nav aria-label="breadcrumb" className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
      <Link to="/" className="hover:text-foreground">Painel</Link>
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {i === crumbs.length - 1
            ? <span className="text-foreground font-medium">{c.label}</span>
            : <Link to={c.href} className="hover:text-foreground">{c.label}</Link>}
        </span>
      ))}
    </nav>
  );
}

export default function AppLayout() {
  const { signOut } = useAuth();
  const { name, initials } = useUserDisplayName();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-3 border-b-2 border-b-primary/40 bg-card px-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 bg-muted rounded-lg px-2.5 py-1.5">
                <div className="h-7 w-7 rounded-full bg-[hsl(var(--accent))]/20 border border-[hsl(var(--accent))]/30 flex items-center justify-center text-xs font-bold text-[hsl(var(--accent))]">
                  {initials}
                </div>
                <span className="text-sm text-foreground/80 max-w-[200px] truncate">{name}</span>
              </div>
              <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut()}>
                <LogOut className="h-4 w-4" /> <span className="hidden sm:inline">Sair</span>
              </Button>
            </div>
          </header>
          <main className="flex-1 min-w-0 overflow-x-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
