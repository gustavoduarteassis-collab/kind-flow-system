import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Calendar, Plane, AlertTriangle, CheckCircle2, Clock,
  Edit2, Trash2, RefreshCw, Plus, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

type PassStatus = "COMPRAR" | "COMPRADA" | "NAO_PRECISA" | "EM_APROVACAO" | "CANCELADA";

interface Visita {
  id: string;
  pipeline_store_id: string | null;
  filial: string | null;
  loja_nome: string;
  cidade: string | null;
  uf: string | null;
  analista_responsavel: string | null;
  data_visita_tecnica: string | null;
  data_chegada_implantacao: string | null;
  data_inauguracao: string | null;
  status_passagem_visita: PassStatus;
  status_passagem_chegada: PassStatus;
  confirmacao_visita: string | null;
  confirmacao_chegada: string | null;
  visita_realizada: boolean;
  implantacao_realizada: boolean;
  observacoes: string | null;
  deleted_at: string | null;
}

interface PipelineRow {
  id: string;
  filial: string | null;
  local: string | null;
  cidade: string | null;
  estado: string | null;
  analista_obra: string | null;
  implantadora: string | null;
  data_inauguracao: string | null;
  previsao_inauguracao: string | null;
  status_geral: string | null;
  reforma: boolean | null;
  transferido: boolean | null;
  deleted_at: string | null;
}

function parseFlexibleDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
  if (m) {
    const d = m[1].padStart(2, "0");
    const mo = m[2].padStart(2, "0");
    let y = m[3];
    if (y.length === 2) y = "20" + y;
    return `${y}-${mo}-${d}`;
  }
  return null;
}

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

const STATUS_OPTIONS: { value: PassStatus; label: string }[] = [
  { value: "COMPRAR", label: "COMPRAR" },
  { value: "COMPRADA", label: "COMPRADA" },
  { value: "NAO_PRECISA", label: "NÃO PRECISA" },
  { value: "EM_APROVACAO", label: "EM APROVAÇÃO" },
  { value: "CANCELADA", label: "CANCELADA" },
];

function statusClass(s: PassStatus): string {
  switch (s) {
    case "COMPRAR": return "bg-red-50 text-red-700 border-red-200";
    case "COMPRADA": return "bg-green-50 text-green-700 border-green-200";
    case "NAO_PRECISA": return "bg-gray-50 text-gray-500 border-gray-200";
    case "EM_APROVACAO": return "bg-amber-50 text-amber-700 border-amber-200";
    case "CANCELADA": return "bg-gray-50 text-gray-400 border-gray-200 line-through";
  }
}

function isInaugurada(status: string | null): boolean {
  return !!status && /inaugurad/i.test(status);
}

export default function Cronograma() {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [pipeline, setPipeline] = useState<PipelineRow[]>([]);
  const [editing, setEditing] = useState<Visita | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [newSearch, setNewSearch] = useState("");

  async function loadAll() {
    setLoading(true);
    try {
      const [{ data: v, error: ve }, { data: p, error: pe }] = await Promise.all([
        (supabase as any).from("visitas_cronograma").select("*").is("deleted_at", null),
        supabase.from("pipeline_stores")
          .select("id,filial,local,cidade,estado,analista_obra,implantadora,data_inauguracao,previsao_inauguracao,status_geral,reforma,transferido,deleted_at")
          .is("deleted_at", null),
      ]);
      if (ve) throw ve;
      if (pe) throw pe;
      setVisitas((v as Visita[]) || []);
      setPipeline((p as PipelineRow[]) || []);
    } catch (err: any) {
      toast.error("Erro ao carregar cronograma: " + (err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  // Auto-sync at load: insert missing + refresh funil-sourced fields
  useEffect(() => {
    if (loading) return;
    if (!pipeline.length) return;
    syncWithFunnel(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  async function syncWithFunnel(silent = false) {
    setSyncing(true);
    try {
      const notInaug = pipeline.filter(
        (p) => !isInaugurada(p.status_geral) && !p.reforma && !p.transferido && p.filial && p.filial.trim(),
      );
      const byFilial = new Map(
        visitas.map((v) => [String(v.filial || "").trim().toLowerCase(), v]),
      );
      const toInsert: any[] = [];
      const toUpdate: { id: string; patch: any }[] = [];

      for (const p of notInaug) {
        const key = String(p.filial || "").trim().toLowerCase();
        const existing = byFilial.get(key);
        const iso = parseFlexibleDate(p.data_inauguracao) || parseFlexibleDate(p.previsao_inauguracao);
        const analista = p.analista_obra || p.implantadora || null;
        if (!existing) {
          toInsert.push({
            pipeline_store_id: p.id,
            filial: p.filial,
            loja_nome: p.local || p.filial || "Sem nome",
            cidade: p.cidade,
            uf: p.estado,
            analista_responsavel: analista,
            data_inauguracao: iso,
            status_passagem_visita: "COMPRAR",
            status_passagem_chegada: "COMPRAR",
            visita_realizada: false,
            implantacao_realizada: false,
          });
        } else {
          const patch: any = {};
          if ((p.local || existing.loja_nome) && p.local && p.local !== existing.loja_nome) patch.loja_nome = p.local;
          if (p.cidade !== existing.cidade) patch.cidade = p.cidade;
          if (p.estado !== existing.uf) patch.uf = p.estado;
          if (analista && analista !== existing.analista_responsavel) patch.analista_responsavel = analista;
          if (iso && iso !== existing.data_inauguracao) patch.data_inauguracao = iso;
          if (!existing.pipeline_store_id) patch.pipeline_store_id = p.id;
          if (Object.keys(patch).length) toUpdate.push({ id: existing.id, patch });
        }
      }

      if (toInsert.length) {
        const { error } = await (supabase as any).from("visitas_cronograma").insert(toInsert);
        if (error) throw error;
      }
      for (const u of toUpdate) {
        const { error } = await (supabase as any).from("visitas_cronograma").update(u.patch).eq("id", u.id);
        if (error) throw error;
      }
      if (toInsert.length || toUpdate.length) {
        await loadAll();
        if (!silent) toast.success(`Sincronizado: ${toInsert.length} novas, ${toUpdate.length} atualizadas`);
      } else if (!silent) {
        toast("Nada para sincronizar.");
      }
    } catch (err: any) {
      toast.error("Erro na sincronização: " + (err?.message || err));
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(id: string, field: "status_passagem_visita" | "status_passagem_chegada", value: PassStatus) {
    const prev = visitas;
    setVisitas((vs) => vs.map((v) => (v.id === id ? { ...v, [field]: value } : v)));
    const { error } = await (supabase as any).from("visitas_cronograma").update({ [field]: value }).eq("id", id);
    if (error) {
      setVisitas(prev);
      toast.error("Erro ao atualizar status");
    }
  }

  async function softDelete(id: string) {
    if (!confirm("Remover esta loja do cronograma?")) return;
    const { error } = await (supabase as any).from("visitas_cronograma").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error("Erro ao remover"); return; }
    setVisitas((vs) => vs.filter((v) => v.id !== id));
    toast.success("Removida do cronograma");
  }

  async function saveEdit(patch: Partial<Visita>) {
    if (!editing) return;
    const payload: any = {
      analista_responsavel: patch.analista_responsavel ?? editing.analista_responsavel,
      data_visita_tecnica: patch.data_visita_tecnica ?? editing.data_visita_tecnica,
      data_chegada_implantacao: patch.data_chegada_implantacao ?? editing.data_chegada_implantacao,
      status_passagem_visita: patch.status_passagem_visita ?? editing.status_passagem_visita,
      confirmacao_visita: patch.confirmacao_visita ?? editing.confirmacao_visita,
      status_passagem_chegada: patch.status_passagem_chegada ?? editing.status_passagem_chegada,
      confirmacao_chegada: patch.confirmacao_chegada ?? editing.confirmacao_chegada,
      visita_realizada: patch.visita_realizada ?? editing.visita_realizada,
      implantacao_realizada: patch.implantacao_realizada ?? editing.implantacao_realizada,
      observacoes: patch.observacoes ?? editing.observacoes,
    };
    const { error } = await (supabase as any).from("visitas_cronograma").update(payload).eq("id", editing.id);
    if (error) { toast.error("Erro ao salvar"); return; }
    toast.success("Visita atualizada");
    setEditing(null);
    loadAll();
  }

  const sorted = useMemo(() => {
    return [...visitas].sort((a, b) => {
      if (!a.data_chegada_implantacao && !b.data_chegada_implantacao) return 0;
      if (!a.data_chegada_implantacao) return 1;
      if (!b.data_chegada_implantacao) return -1;
      return a.data_chegada_implantacao.localeCompare(b.data_chegada_implantacao);
    });
  }, [visitas]);

  // Conflicts
  const conflicts = useMemo(() => {
    const list: { type: string; label: string; items: Visita[] }[] = [];
    // Gustavo visita mesma data
    const byDateGustavo = new Map<string, Visita[]>();
    for (const v of visitas) {
      if (v.data_visita_tecnica && /gustavo/i.test(v.analista_responsavel || "")) {
        const k = v.data_visita_tecnica;
        byDateGustavo.set(k, [...(byDateGustavo.get(k) || []), v]);
      }
    }
    for (const [d, items] of byDateGustavo) if (items.length > 1) {
      list.push({ type: "Visita Gustavo", label: `Duas visitas técnicas em ${fmtDate(d)}`, items });
    }
    // Implantadora janela 5 dias
    const byImpl = new Map<string, Visita[]>();
    for (const v of visitas) {
      const a = (v.analista_responsavel || "").trim().toLowerCase();
      if (!a || /gustavo/i.test(a)) continue;
      if (!v.data_chegada_implantacao) continue;
      byImpl.set(a, [...(byImpl.get(a) || []), v]);
    }
    for (const [a, items] of byImpl) {
      const sortedI = [...items].sort((x, y) => (x.data_chegada_implantacao || "").localeCompare(y.data_chegada_implantacao || ""));
      for (let i = 0; i < sortedI.length - 1; i++) {
        const d1 = new Date(sortedI[i].data_chegada_implantacao! + "T00:00:00").getTime();
        const d2 = new Date(sortedI[i + 1].data_chegada_implantacao! + "T00:00:00").getTime();
        if (Math.abs(d2 - d1) / 86400000 <= 5) {
          list.push({
            type: "Implantadora",
            label: `${sortedI[i].analista_responsavel}: chegadas próximas (${fmtDate(sortedI[i].data_chegada_implantacao)} e ${fmtDate(sortedI[i + 1].data_chegada_implantacao)})`,
            items: [sortedI[i], sortedI[i + 1]],
          });
        }
      }
    }
    return list;
  }, [visitas]);

  const conflictIds = useMemo(() => {
    const s = new Set<string>();
    conflicts.forEach((c) => c.items.forEach((i) => s.add(i.id)));
    return s;
  }, [conflicts]);

  function farol(v: Visita): { color: string; label: string } {
    const d = daysUntil(v.data_chegada_implantacao);
    if (conflictIds.has(v.id)) return { color: "bg-red-500", label: "Conflito" };
    if (d !== null && d <= 14 && v.status_passagem_chegada === "COMPRAR") return { color: "bg-red-500", label: "Urgente" };
    if (d !== null && d <= 30 && v.status_passagem_chegada === "COMPRAR") return { color: "bg-amber-500", label: "Atenção" };
    if (/definir/i.test(v.analista_responsavel || "")) return { color: "bg-amber-500", label: "Analista pendente" };
    const passOk = (s: PassStatus) => s === "COMPRADA" || s === "NAO_PRECISA";
    if (passOk(v.status_passagem_visita) && passOk(v.status_passagem_chegada)) return { color: "bg-green-500", label: "Ok" };
    if (!v.data_chegada_implantacao) return { color: "bg-gray-300", label: "Sem data" };
    return { color: "bg-gray-300", label: "—" };
  }

  const kpis = useMemo(() => {
    const total = visitas.length;
    const pendentes = visitas.filter((v) => v.status_passagem_visita === "COMPRAR" || v.status_passagem_chegada === "COMPRAR").length;
    const now = Date.now();
    const in30 = visitas.filter((v) => {
      const d = daysUntil(v.data_inauguracao);
      return d !== null && d >= 0 && d <= 30;
    }).length;
    return { total, pendentes, conflitos: conflicts.length, in30 };
  }, [visitas, conflicts]);

  const pendentesList = useMemo(() => {
    const rows: { v: Visita; tipo: "Visita" | "Chegada"; data: string | null; dias: number | null; status: PassStatus }[] = [];
    for (const v of visitas) {
      if (v.status_passagem_visita === "COMPRAR") rows.push({ v, tipo: "Visita", data: v.data_visita_tecnica, dias: daysUntil(v.data_visita_tecnica), status: v.status_passagem_visita });
      if (v.status_passagem_chegada === "COMPRAR") rows.push({ v, tipo: "Chegada", data: v.data_chegada_implantacao, dias: daysUntil(v.data_chegada_implantacao), status: v.status_passagem_chegada });
    }
    rows.sort((a, b) => {
      const da = a.dias ?? 99999, db = b.dias ?? 99999;
      return da - db;
    });
    return rows;
  }, [visitas]);

  const filialsNoCronograma = useMemo(() => {
    const inCron = new Set(visitas.map((v) => String(v.filial || "").trim().toLowerCase()));
    return pipeline.filter((p) => p.filial && !inCron.has(p.filial.trim().toLowerCase()) && !isInaugurada(p.status_geral));
  }, [visitas, pipeline]);

  const newFiltered = useMemo(() => {
    const q = newSearch.trim().toLowerCase();
    const src = filialsNoCronograma;
    if (!q) return src.slice(0, 30);
    return src.filter((p) =>
      (p.local || "").toLowerCase().includes(q) || (p.filial || "").toLowerCase().includes(q),
    ).slice(0, 30);
  }, [newSearch, filialsNoCronograma]);

  async function addFromFunil(p: PipelineRow) {
    const iso = parseFlexibleDate(p.data_inauguracao) || parseFlexibleDate(p.previsao_inauguracao);
    const analista = p.analista_obra || p.implantadora || null;
    const { error } = await (supabase as any).from("visitas_cronograma").insert({
      pipeline_store_id: p.id,
      filial: p.filial,
      loja_nome: p.local || p.filial || "Sem nome",
      cidade: p.cidade,
      uf: p.estado,
      analista_responsavel: analista,
      data_inauguracao: iso,
      status_passagem_visita: "COMPRAR",
      status_passagem_chegada: "COMPRAR",
    });
    if (error) { toast.error("Erro ao adicionar"); return; }
    toast.success(`${p.local || p.filial} adicionada`);
    setNewOpen(false);
    setNewSearch("");
    loadAll();
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" /> Cronograma de Visitas 2026
          </h1>
          <p className="text-sm text-muted-foreground">Gestão de visitas técnicas, chegadas de implantadoras e passagens.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => syncWithFunnel(false)} disabled={syncing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} /> Sincronizar com Funil
          </Button>
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Visita
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI icon={<Calendar className="h-4 w-4" />} label="Total no cronograma" value={kpis.total} />
        <KPI icon={<Plane className="h-4 w-4" />} label="Passagens a comprar" value={kpis.pendentes} accent="text-red-600" />
        <KPI icon={<AlertTriangle className="h-4 w-4" />} label="Conflitos detectados" value={kpis.conflitos} accent="text-red-600" />
        <KPI icon={<Clock className="h-4 w-4" />} label="Inaugurações ≤ 30d" value={kpis.in30} accent="text-amber-600" />
      </div>

      <Tabs defaultValue="todas">
        <TabsList>
          <TabsTrigger value="todas">Todas as lojas</TabsTrigger>
          <TabsTrigger value="pendentes">⚠ Passagens Pendentes</TabsTrigger>
          <TabsTrigger value="conflitos">🔴 Conflitos</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-4">
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">#</TableHead>
                    <TableHead className="w-14">Farol</TableHead>
                    <TableHead>Filial</TableHead>
                    <TableHead>Loja</TableHead>
                    <TableHead>UF</TableHead>
                    <TableHead>Analista</TableHead>
                    <TableHead>Visita Técnica</TableHead>
                    <TableHead>Chegada Impl.</TableHead>
                    <TableHead>Inauguração</TableHead>
                    <TableHead>Dias p/ Chegada</TableHead>
                    <TableHead>Passagem Visita</TableHead>
                    <TableHead>Passagem Chegada</TableHead>
                    <TableHead className="w-20">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map((v, i) => {
                    const f = farol(v);
                    const dias = daysUntil(v.data_chegada_implantacao);
                    return (
                      <TableRow key={v.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <span title={f.label} className={`inline-block h-3 w-3 rounded-full ${f.color}`} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{v.filial || "—"}</TableCell>
                        <TableCell className="font-medium">{v.loja_nome}</TableCell>
                        <TableCell>{v.uf || "—"}</TableCell>
                        <TableCell>{v.analista_responsavel || "—"}</TableCell>
                        <TableCell className="text-sm">{fmtDate(v.data_visita_tecnica)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(v.data_chegada_implantacao)}</TableCell>
                        <TableCell className="text-sm">{fmtDate(v.data_inauguracao)}</TableCell>
                        <TableCell className="text-sm">{dias === null ? "—" : `${dias}d`}</TableCell>
                        <TableCell>
                          <StatusSelect value={v.status_passagem_visita} onChange={(val) => updateStatus(v.id, "status_passagem_visita", val)} />
                        </TableCell>
                        <TableCell>
                          <StatusSelect value={v.status_passagem_chegada} onChange={(val) => updateStatus(v.id, "status_passagem_chegada", val)} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button size="icon" variant="ghost" onClick={() => setEditing(v)}>
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => softDelete(v.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {sorted.length === 0 && (
                    <TableRow><TableCell colSpan={13} className="text-center text-muted-foreground py-8">Nenhuma loja no cronograma.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pendentes" className="mt-4">
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Loja</TableHead>
                  <TableHead>Quem vai</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Dias restantes</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendentesList.map((r, i) => (
                  <TableRow key={r.v.id + r.tipo + i}>
                    <TableCell className="font-medium">{r.v.loja_nome}</TableCell>
                    <TableCell>{r.v.analista_responsavel || "—"}</TableCell>
                    <TableCell>{fmtDate(r.data)}</TableCell>
                    <TableCell className={r.dias !== null && r.dias <= 14 ? "text-red-600 font-medium" : ""}>
                      {r.dias === null ? "—" : `${r.dias}d`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusClass(r.status)}>{r.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {pendentesList.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma passagem pendente.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="conflitos" className="mt-4 space-y-3">
          {conflicts.length === 0 && (
            <div className="border rounded-md p-8 text-center text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              Sem conflitos detectados.
            </div>
          )}
          {conflicts.map((c, idx) => (
            <div key={idx} className="border border-red-200 bg-red-50 rounded-md p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide text-red-700 font-semibold">{c.type}</div>
                  <div className="font-medium text-red-900 mt-1">{c.label}</div>
                  <div className="mt-2 space-y-1 text-sm">
                    {c.items.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <span className="font-medium">{v.loja_nome}</span>
                        <span className="text-muted-foreground">
                          visita {fmtDate(v.data_visita_tecnica)} · chegada {fmtDate(v.data_chegada_implantacao)}
                        </span>
                        <Button size="sm" variant="outline" onClick={() => setEditing(v)}>Resolver</Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>
      </Tabs>

      {/* Edit modal */}
      <EditModal visita={editing} onClose={() => setEditing(null)} onSave={saveEdit} />

      {/* New modal */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar loja ao cronograma</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input className="pl-8" placeholder="Buscar por nome ou filial..." value={newSearch} onChange={(e) => setNewSearch(e.target.value)} />
            </div>
            <div className="max-h-80 overflow-y-auto border rounded-md divide-y">
              {newFiltered.map((p) => (
                <button key={p.id} onClick={() => addFromFunil(p)} className="w-full text-left px-3 py-2 hover:bg-muted flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium text-sm">{p.local || "—"}</div>
                    <div className="text-xs text-muted-foreground">{p.filial} · {p.cidade}/{p.estado}</div>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {newFiltered.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground text-center">Nenhuma loja disponível.</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KPI({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent?: string }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">{icon}{label}</div>
      <div className={`text-3xl font-bold mt-1 ${accent || ""}`}>{value}</div>
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: PassStatus; onChange: (v: PassStatus) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as PassStatus)}>
      <SelectTrigger className={`h-7 w-[140px] text-xs ${statusClass(value)}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUS_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function EditModal({ visita, onClose, onSave }: { visita: Visita | null; onClose: () => void; onSave: (patch: Partial<Visita>) => void }) {
  const [form, setForm] = useState<Visita | null>(visita);
  useEffect(() => { setForm(visita); }, [visita]);
  if (!form) return null;
  const set = (k: keyof Visita, v: any) => setForm({ ...form, [k]: v });
  return (
    <Dialog open={!!visita} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar visita — {form.loja_nome}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loja"><Input value={form.loja_nome} readOnly disabled /></Field>
          <Field label="Analista responsável"><Input value={form.analista_responsavel || ""} onChange={(e) => set("analista_responsavel", e.target.value)} /></Field>
          <Field label="Data da visita técnica (Gustavo)"><Input type="date" value={form.data_visita_tecnica || ""} onChange={(e) => set("data_visita_tecnica", e.target.value || null)} /></Field>
          <Field label="Data de chegada da implantadora"><Input type="date" value={form.data_chegada_implantacao || ""} onChange={(e) => set("data_chegada_implantacao", e.target.value || null)} /></Field>
          <Field label="Data de inauguração (sincronizada)"><Input type="date" value={form.data_inauguracao || ""} readOnly disabled /></Field>
          <div />
          <Field label="Status passagem visita">
            <Select value={form.status_passagem_visita} onValueChange={(v) => set("status_passagem_visita", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Confirmação passagem visita (voo/código)"><Input value={form.confirmacao_visita || ""} onChange={(e) => set("confirmacao_visita", e.target.value)} /></Field>
          <Field label="Status passagem chegada">
            <Select value={form.status_passagem_chegada} onValueChange={(v) => set("status_passagem_chegada", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Confirmação passagem chegada (voo/código)"><Input value={form.confirmacao_chegada || ""} onChange={(e) => set("confirmacao_chegada", e.target.value)} /></Field>
          <Field label="Visita realizada?">
            <div className="flex items-center gap-2 h-9"><Switch checked={form.visita_realizada} onCheckedChange={(v) => set("visita_realizada", v)} /><span className="text-sm">{form.visita_realizada ? "Sim" : "Não"}</span></div>
          </Field>
          <Field label="Implantação realizada?">
            <div className="flex items-center gap-2 h-9"><Switch checked={form.implantacao_realizada} onCheckedChange={(v) => set("implantacao_realizada", v)} /><span className="text-sm">{form.implantacao_realizada ? "Sim" : "Não"}</span></div>
          </Field>
          <div className="col-span-2">
            <Field label="Observações"><Textarea rows={3} value={form.observacoes || ""} onChange={(e) => set("observacoes", e.target.value)} /></Field>
          </div>
        </div>
        <Separator />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => onSave(form)}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
