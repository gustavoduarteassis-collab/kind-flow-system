import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";

const TABLES: { key: string; label: string }[] = [
  { key: "stores", label: "Lojas" },
  { key: "pipeline_stores", label: "Funil" },
  { key: "tasks", label: "Tarefas" },
  { key: "task_comments", label: "Comentários" },
  { key: "team_members", label: "Equipe" },
  { key: "franchisee_access", label: "Acessos" },
  { key: "habits", label: "Hábitos" },
  { key: "habit_completions", label: "Marcações" },
  { key: "team_events", label: "Eventos" },
  { key: "custos_geral_entries", label: "Custos" },
  { key: "fornecedores_homologados", label: "Forn. Homolog." },
  { key: "fornecedores_prospeccao", label: "Forn. Prospec." },
  { key: "construction_diary", label: "Diário" },
  { key: "diary_photos", label: "Fotos Diário" },
  { key: "agm_planos_acao", label: "Planos AGM" },
  { key: "agm_action_plans", label: "Ações AGM" },
  { key: "agm_entries", label: "Entradas AGM" },
  { key: "analyst_goals", label: "Metas Analista" },
];

type Row = { id: string; deleted_at: string; deleted_by: string | null; label: string };

export default function ItensExcluidos() {
  const [active, setActive] = useState(TABLES[0].key);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = async (table: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("list_soft_deleted" as any, { _table: table });
      if (error) throw error;
      setRows((data as Row[]) ?? []);
    } catch (err: any) {
      console.error("list_soft_deleted error:", err);
      toast.error("Não foi possível carregar os itens excluídos. Tente novamente em instantes.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(active); }, [active]);

  const handleRestore = async (id: string) => {
    setRestoring(id);
    const { error } = await supabase.rpc("soft_restore" as any, { _table: active, _id: id });
    setRestoring(null);
    if (error) {
      toast.error("Erro ao restaurar: " + error.message);
      return;
    }
    toast.success("Item restaurado");
    load(active);
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Trash2 className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold">Itens excluídos</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Nada é deletado permanentemente. Aqui você pode restaurar qualquer registro removido.
      </p>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex flex-wrap h-auto">
          {TABLES.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
        {TABLES.map((t) => (
          <TabsContent key={t.key} value={t.key}>
            <Card className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando...
                </div>
              ) : rows.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">Nenhum item excluído.</div>
              ) : (
                <div className="space-y-2">
                  {rows.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between border rounded-md p-3 hover:bg-muted/30"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{r.label || "(sem nome)"}</div>
                        <div className="text-xs text-muted-foreground">
                          Excluído em {new Date(r.deleted_at).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRestore(r.id)}
                        disabled={restoring === r.id}
                      >
                        {restoring === r.id ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <RotateCcw className="h-4 w-4 mr-2" />
                        )}
                        Restaurar
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
