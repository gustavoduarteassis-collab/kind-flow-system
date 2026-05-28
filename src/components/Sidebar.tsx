import React from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Store, 
  GitBranch, 
  Users, 
  Settings, 
  LogOut,
  HardHat,
  ChevronRight,
  TrendingUp,
  FileText
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import logoConstance from "@/assets/logo-constance.svg";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard Global", path: "/" },
  { icon: GitBranch, label: "Funil de Obras", path: "/pipeline" },
  { icon: Store, label: "Lista de Lojas", path: "/lojas" },
  { icon: Users, label: "Equipe", path: "/equipe" },
  { icon: TrendingUp, label: "KPIs & Metas", path: "/agm" },
  { icon: HardHat, label: "Lojas Próprias", path: "/cronograma-proprias" },
  { icon: FileText, label: "Documentos", path: "/diversos" },
];

export const Sidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r bg-white lg:flex">
      <div className="flex h-20 items-center gap-3 border-b px-6">
        <img src={logoConstance} alt="Constance" className="h-8 w-auto" />
        <div className="h-6 w-px bg-slate-200" />
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Portal</span>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive 
                  ? "bg-[hsl(38,70%,50%)]/10 text-[hsl(38,70%,50%)]" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5",
                isActive ? "text-[hsl(38,70%,50%)]" : "text-slate-400 group-hover:text-slate-500"
              )} />
              {item.label}
              {isActive && (
                <ChevronRight className="ml-auto h-4 w-4" />
              )}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <div className="mb-4 flex items-center gap-3 rounded-lg bg-slate-50 p-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(38,70%,50%)] text-xs font-bold text-white uppercase">
            {user?.email?.charAt(0)}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-bold text-slate-900">{user?.email}</p>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">Coordenador</p>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
        >
          <LogOut className="h-5 w-5" />
          Sair do Portal
        </button>
      </div>
    </aside>
  );
};
