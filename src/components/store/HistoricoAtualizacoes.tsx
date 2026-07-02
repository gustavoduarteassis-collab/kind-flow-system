import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MessageSquare, Trash2, Send } from "lucide-react";
import { formatBR } from "@/utils/safeDate";

interface Update {
  id: string;
  texto: string;
  autor_nome: string | null;
  autor_user_id: string | null;
  created_at: string;
}

interface Props {
  storeId: string;
  storeFilial?: string;
}

export default function HistoricoAtualizacoes({ storeId, storeFilial }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Update[]>([]);
  const [texto, setTexto] = useState("");
  const [autorNome, setAutorNome] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("store_updates")
      .select("id, texto, autor_nome, autor_user_id, created_at")
      .eq("store_id", storeId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    setItems((data as any) || []);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("team_members")
        .select("name")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();
      setAutorNome((data as any)?.name || user.email || "Usuário");
    })();
  }, [user]);

  async function handleSave() {
    if (!user || !texto.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("store_updates").insert({
      store_id: storeId,
      texto: texto.trim(),
      autor_nome: autorNome,
      autor_user_id: user.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar atualização");
      return;
    }
    setTexto("");
    toast.success("Atualização registrada!");
    fetchItems();
    // Também espelha no Funil (pipeline_stores) se houver filial
    if (storeFilial) {
      await supabase
        .from("pipeline_stores")
        .update({ status_geral: texto.trim() })
        .eq("filial", storeFilial)
        .is("deleted_at", null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir esta atualização?")) return;
    const { error } = await supabase
      .from("store_updates")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", id);
    if (error) { toast.error("Erro ao excluir"); return; }
    toast.success("Excluída");
    fetchItems();
  }

  return (
    <div className="rounded-xl border bg-card">
      <div className="p-4 border-b flex items-center gap-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Histórico de Atualizações</h3>
        <Badge variant="secondary" className="ml-auto">{items.length}</Badge>
      </div>

      <div className="p-4 border-b bg-muted/30 space-y-2">
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={`Nova atualização como ${autorNome || "você"}... (aparecerá no Funil e no AGM automaticamente)`}
          rows={3}
          className="resize-none text-sm"
        />
        <div className="flex justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving || !texto.trim()} className="gap-1.5">
            <Send className="h-3.5 w-3.5" />
            {saving ? "Registrando..." : "Registrar atualização"}
          </Button>
        </div>
      </div>

      <div className="divide-y max-h-[500px] overflow-y-auto">
        {loading && <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>}
        {!loading && items.length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">Nenhuma atualização ainda.</div>
        )}
        {items.map((u, idx) => (
          <div key={u.id} className={`p-4 ${idx === 0 ? "bg-primary/5" : ""}`}>
            <div className="flex items-center gap-2 mb-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{u.autor_nome || "—"}</span>
              <span>·</span>
              <span>{formatBR(u.created_at)} {new Date(u.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
              {idx === 0 && <Badge className="ml-1 h-4 text-[10px] px-1.5">mais recente</Badge>}
              <button
                onClick={() => handleDelete(u.id)}
                className="ml-auto text-muted-foreground hover:text-destructive"
                title="Excluir"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-sm whitespace-pre-line">{u.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
