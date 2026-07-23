import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2, DollarSign, Target, Users, FolderOpen, KeyRound, Home, Trash2, TrendingUp, LayoutGrid, CalendarCheck, Settings, ChevronDown, Store, LayoutDashboard, Calendar, Sparkles,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import logoConstance from "@/assets/logo-constance.svg";

const mainItems = [
  { title: "Executivo", url: "/", icon: Sparkles },
  { title: "Lojas & Obras", url: "/lojas", icon: Building2 },
  { title: "Cronograma", url: "/cronograma", icon: Calendar },
  { title: "Custos Geral", url: "/custos-geral", icon: DollarSign },
  { title: "AGM", url: "/agm", icon: Target },
  { title: "Equipe & Tarefas", url: "/equipe", icon: Users },
];

const toolItems = [
  { title: "Validação de Datas", url: "/validacao-datas", icon: CalendarCheck },
  { title: "Diversos", url: "/diversos", icon: FolderOpen },
  { title: "Acessos", url: "/acessos", icon: KeyRound },
  { title: "Itens excluídos", url: "/itens-excluidos", icon: Trash2 },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const toolsActive = toolItems.some((t) => pathname.startsWith(t.url));
  const [toolsOpen, setToolsOpen] = useState<boolean>(toolsActive);
  const isActive = (path: string) =>
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

  const renderItem = (item: { title: string; url: string; icon: any }) => (
    <SidebarMenuItem key={item.url}>
      <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
        <NavLink to={item.url} className="flex items-center gap-2">
          <item.icon className="h-4 w-4" />
          {!collapsed && <span>{item.title}</span>}
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );

  return (
    <Sidebar collapsible="icon">
      <div className={`shrink-0 flex ${collapsed ? "items-center justify-center" : "flex-col items-start gap-2"} px-3 py-4 border-b border-sidebar-border`}>
        <img src={logoConstance} alt="Constance" className="h-7 brightness-0 invert opacity-90 shrink-0" />
        {!collapsed && (
          <div className="leading-tight w-full">
            <p className="text-sm font-bold text-sidebar-foreground">Constance Obra</p>
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">Implantação</p>
          </div>
        )}
      </div>
      <SidebarContent className="overflow-y-auto flex-1 min-h-0">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Operação</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>{mainItems.map(renderItem)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => setToolsOpen((v) => !v)}
                  isActive={toolsActive}
                  tooltip="Ferramentas"
                  className="justify-between"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {!collapsed && <span>⚙️ Ferramentas</span>}
                  </span>
                  {!collapsed && (
                    <ChevronDown className={`h-4 w-4 transition-transform ${toolsOpen ? "" : "-rotate-90"}`} />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              {(toolsOpen || collapsed) && toolItems.map(renderItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
