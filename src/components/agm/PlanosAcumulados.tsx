import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, RefreshCw, CheckCircle2, AlertTriangle, Loader2, History } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type Plano = {
  id: string;
  codigo: string;
  origem: string;
  mes_criacao: string;
  causa: string;
  acao: string;
  como: string | null;
  responsavel: string;
  prazo_inicial: string | null;
  prazo_final: string;
  status: "aberto" | "em_andamento" | "concluido" | "atrasado";
  data_conclusao: string | null;
  ultima_atualizacao_data: string | null;
  ultima_atualizacao_texto: string | null;
};

type UpdateRow = { id: string; data: string; texto: string };

function calcFarol(p: Plano): "verde" | "amarelo" | "vermelho" {
  if (p.status === "concluido") return "verde";
  const hoje = new Date();
  const prazo = parseISO(p.prazo_final);
  const diasParaPrazo = differenceInDays(prazo, hoje);
  const diasSemUpdate = p.ultima_atualizacao_data
    ? differenceInDays(hoje, parseISO(p.ultima_atualizacao_data))
    : differenceInDays(hoje, parseISO(p.mes_criacao + "-01"));
  if (diasParaPrazo < 0 || diasSemUpdate > 30) return "vermelho";
  if (diasParaPrazo <= 7 || diasSemUpdate >= 14) return "amarelo";
  return "verde";
}

const farolEmoji = { verde: "🟢", amarelo: "🟡", vermelho: "🔴" } as const;
const farolBg = {
  verde: "bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]",
  amarelo: "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]",
  vermelho: "bg-destructive text-destructive-foreground",
};
const statusLabel = {
  aberto: "Aberto",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  atrasado: "Atrasado",
};

export function PlanosAcumulados() {
  const { toast } = useToast();
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterFarol, setFilterFarol] = useState<string>("todos");

  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState<Plano | null>(null);
  const [historyOpen, setHistoryOpen] = useState<Plano | null>(null);
  const [history, setHistory] = useState<UpdateRow[]>([]);
  const [savingUpdate, setSavingUpdate] = useState(false);
  const [updateText, setUpdateText] = useState("");

  const [form, setForm] = useState({
    origem: "", causa: "", acao: "", como: "", responsavel: "Gustavo",
    prazo_inicial: "", prazo_final: "",
  });

  async function fetchPlanos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("agm_planos_acao")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar planos", description: error.message, variant: "destructive" });
    } else {
      setPlanos((data as Plano[]) || []);
    }
    setLoading(false);
  }

  useEffect(() => { fetchPlanos(); }, []);

  const filtered = useMemo(() => {
    return planos.filter((p) => {
      if (filterStatus !== "todos" && p.status !== filterStatus) return false;
      if (filterFarol !== "todos" && calcFarol(p) !== filterFarol) return false;
      return true;
    });
  }, [planos, filterStatus, filterFarol]);

  const semUpdate2sem = useMemo(
    () =>
      planos.filter((p) => {
        if (p.status === "concluido") return false;
        const ref = p.ultima_atualizacao_data || p.mes_criacao + "-01";
        return differenceInDays(new Date(), parseISO(ref)) >= 14;
      }),
    [planos],
  );

  async function createPlan() {
    if (!form.origem || !form.causa || !form.acao || !form.prazo_final) {
      toast({ title: "Preencha origem, causa, ação e prazo final", variant: "destructive" });
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("agm_planos_acao").insert({
      origem: form.origem,
      mes_criacao: format(new Date(), "yyyy-MM"),
      causa: form.causa,
      acao: form.acao,
      como: form.como || null,
      responsavel: form.responsavel,
      prazo_inicial: form.prazo_inicial || null,
      prazo_final: form.prazo_final,
      status: "aberto",
      created_by: user?.id ?? null,
    });
    if (error) {
      toast({ title: "Erro ao criar plano", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plano criado" });
    setCreateOpen(false);
    setForm({ origem: "", causa: "", acao: "", como: "", responsavel: "Gustavo", prazo_inicial: "", prazo_final: "" });
    fetchPlanos();
  }

  async function saveUpdate() {
    if (!updateOpen || !updateText.trim()) return;
    setSavingUpdate(true);
    const today = format(new Date(), "yyyy-MM-dd");
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insErr } = await supabase.from("agm_plano_updates").insert({
      plano_id: updateOpen.id, data: today, texto: updateText.trim(), autor: user?.id ?? null,
    });
    if (insErr) {
      toast({ title: "Erro ao registrar atualização", description: insErr.message, variant: "destructive" });
      setSavingUpdate(false);
      return;
    }
    await supabase.from("agm_planos_acao").update({
      ultima_atualizacao_data: today,
      ultima_atualizacao_texto: updateText.trim(),
      status: updateOpen.status === "aberto" ? "em_andamento" : updateOpen.status,
    }).eq("id", updateOpen.id);
    setSavingUpdate(false);
    setUpdateOpen(null);
    setUpdateText("");
    fetchPlanos();
  }

  async function concluir(p: Plano) {
    const today = format(new Date(), "yyyy-MM-dd");
    const { error } = await supabase.from("agm_planos_acao").update({
      status: "concluido",
      data_conclusao: today,
      ultima_atualizacao_data: today,
      ultima_atualizacao_texto: "Concluído",
    }).eq("id", p.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    await supabase.from("agm_plano_updates").insert({
      plano_id: p.id, data: today, texto: "✅ Concluído",
    });
    toast({ title: `${p.codigo} marcado como concluído` });
    fetchPlanos();
  }

  async function openHistory(p: Plano) {
    setHistoryOpen(p);
    const { data } = await supabase
      .from("agm_plano_updates")
      .select("id,data,texto")
      .eq("plano_id", p.id)
      .order("data", { ascending: false });
    setHistory((data as UpdateRow[]) || []);
  }

  return (
    <div className="space-y-4">
      {semUpdate2sem.length > 0 && (
        <Card className="border-[hsl(var(--accent))]">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-[hsl(var(--accent))]" />
            <div className="text-sm">
              <strong>{semUpdate2sem.length}</strong> {semUpdate2sem.length === 1 ? "plano sem atualização" : "planos sem atualização"} há +14 dias:{" "}
              <span className="text-muted-foreground">{semUpdate2sem.map((p) => p.codigo).join(", ")}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label className="text-xs">Status</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="aberto">Aberto</SelectItem>
              <SelectItem value="em_andamento">Em andamento</SelectItem>
              <SelectItem value="concluido">Concluído</SelectItem>
              <SelectItem value="atrasado">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1">
          <Label className="text-xs">Farol</Label>
          <Select value={filterFarol} onValueChange={setFilterFarol}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="verde">🟢 Verde</SelectItem>
              <SelectItem value="amarelo">🟡 Amarelo</SelectItem>
              <SelectItem value="vermelho">🔴 Vermelho</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchPlanos} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo plano
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-12 text-sm">Nenhum plano encontrado.</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => {
            const farol = calcFarol(p);
            return (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3 flex-wrap">
                    <Badge className={farolBg[farol]}>{farolEmoji[farol]} {p.codigo}</Badge>
                    <Badge variant="outline">{statusLabel[p.status]}</Badge>
                    <Badge variant="secondary">{p.origem}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">
                      Prazo final: {format(parseISO(p.prazo_final), "dd/MM/yyyy", { locale: ptBR })} • Resp.: {p.responsavel}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div><strong>Causa:</strong> <span className="whitespace-pre-line">{p.causa}</span></div>
                  <div><strong>Ação:</strong> <span className="whitespace-pre-line">{p.acao}</span></div>
                  {p.como && <div><strong>Como:</strong> <span className="whitespace-pre-line">{p.como}</span></div>}
                  {p.ultima_atualizacao_texto && (
                    <div className="text-xs text-muted-foreground border-l-2 border-primary/40 pl-2">
                      Última atualização ({p.ultima_atualizacao_data && format(parseISO(p.ultima_atualizacao_data), "dd/MM/yyyy")}): {p.ultima_atualizacao_texto}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" onClick={() => { setUpdateOpen(p); setUpdateText(""); }}>
                      Atualizar
                    </Button>
                    {p.status !== "concluido" && (
                      <Button size="sm" variant="secondary" onClick={() => concluir(p)}>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" onClick={() => openHistory(p)}>
                      <History className="h-3.5 w-3.5 mr-1" /> Histórico
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Novo plano */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Novo plano de ação</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <Label>Origem (loja ou indicador)</Label>
              <Input value={form.origem} onChange={(e) => setForm({ ...form, origem: e.target.value })} placeholder="Ex: Shopping Taboão — Custo/m²" />
            </div>
            <div className="grid gap-1">
              <Label>Causa</Label>
              <Textarea value={form.causa} onChange={(e) => setForm({ ...form, causa: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-1">
              <Label>Ação</Label>
              <Textarea value={form.acao} onChange={(e) => setForm({ ...form, acao: e.target.value })} rows={2} />
            </div>
            <div className="grid gap-1">
              <Label>Como</Label>
              <Textarea value={form.como} onChange={(e) => setForm({ ...form, como: e.target.value })} rows={2} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label>Responsável</Label>
                <Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Prazo inicial</Label>
                <Input type="date" value={form.prazo_inicial} onChange={(e) => setForm({ ...form, prazo_inicial: e.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label>Prazo final *</Label>
                <Input type="date" value={form.prazo_final} onChange={(e) => setForm({ ...form, prazo_final: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={createPlan}>Criar plano</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Atualizar */}
      <Dialog open={!!updateOpen} onOpenChange={(o) => !o && setUpdateOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Atualizar {updateOpen?.codigo}</DialogTitle></DialogHeader>
          <Textarea
            value={updateText}
            onChange={(e) => setUpdateText(e.target.value)}
            placeholder="O que foi feito? Próximos passos? Novo prazo?"
            rows={5}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setUpdateOpen(null)}>Cancelar</Button>
            <Button onClick={saveUpdate} disabled={savingUpdate || !updateText.trim()}>
              {savingUpdate && <Loader2 className="h-4 w-4 animate-spin mr-1" />} Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Histórico */}
      <Dialog open={!!historyOpen} onOpenChange={(o) => !o && setHistoryOpen(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Histórico — {historyOpen?.codigo}</DialogTitle></DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma atualização registrada.</p>
            ) : (
              history.map((h) => (
                <div key={h.id} className="border-l-2 border-primary/40 pl-3 py-1">
                  <div className="text-xs text-muted-foreground">{format(parseISO(h.data), "dd/MM/yyyy", { locale: ptBR })}</div>
                  <div className="text-sm whitespace-pre-line">{h.texto}</div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
