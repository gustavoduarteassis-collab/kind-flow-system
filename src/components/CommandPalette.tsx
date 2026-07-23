import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useStores } from "@/hooks/useStores";
import {
  Building2,
  Sparkles,
  LayoutDashboard,
  DollarSign,
  Calendar,
  Store as StoreIcon,
} from "lucide-react";

/**
 * Paleta de comandos global (⌘K / Ctrl+K).
 * Busca lojas por nome/filial/franqueado e oferece atalhos para páginas principais.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { stores } = useStores();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items = useMemo(
    () =>
      stores
        .filter((s) => !["repasse", "troca", "encerramento", "interno"].includes((s.tipoRegistro || "").toLowerCase()))
        .slice()
        .sort((a, b) => (a.nome || "").localeCompare(b.nome || "", "pt-BR")),
    [stores]
  );

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar loja, franqueado ou página… (⌘K)" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ir para">
          <CommandItem onSelect={() => go("/")}>
            <Sparkles className="mr-2 h-4 w-4" /> Painel Executivo
          </CommandItem>
          <CommandItem onSelect={() => go("/lojas")}>
            <Building2 className="mr-2 h-4 w-4" /> Lojas & Obras
          </CommandItem>
          <CommandItem onSelect={() => go("/obras")}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Painel de obras
          </CommandItem>
          <CommandItem onSelect={() => go("/custos-geral")}>
            <DollarSign className="mr-2 h-4 w-4" /> Custos Geral
          </CommandItem>
          <CommandItem onSelect={() => go("/cronograma")}>
            <Calendar className="mr-2 h-4 w-4" /> Cronograma de viagens
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={`Lojas (${items.length})`}>
          {items.map((s) => (
            <CommandItem
              key={s.id}
              value={`${s.nome} ${s.filial || ""} ${s.franqueado || ""} ${s.analistaObra || ""}`}
              onSelect={() => go(`/loja/${s.id}`)}
            >
              <StoreIcon className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">{s.nome}</span>
              {s.filial && (
                <span className="ml-2 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  {s.filial}
                </span>
              )}
              {s.analistaObra && (
                <span className="ml-auto text-xs text-muted-foreground shrink-0 truncate max-w-[120px]">
                  {s.analistaObra}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
