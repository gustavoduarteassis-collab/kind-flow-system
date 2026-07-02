import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, Minus, Search, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { isStoreLiberated } from "@/utils/inaugurationStatus";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const AUTO_PHASES = [
  { key: "funil", label: "Funil", desc: "Loja cadastrada no funil de expansão. Marcada automaticamente para toda loja em andamento." },
  { key: "preobra", label: "Pré-Obra", desc: "Existe visita técnica registrada ou pelo menos uma solicitação operacional cadastrada." },
  { key: "obra", label: "Obra", desc: "Checklist de obra iniciado e todos os itens marcados como REALIZADO ou NÃO SE APLICA." },
  { key: "checklist", label: "Checklist Final", desc: "Ao menos uma rodada do checklist final de inauguração foi preenchida." },
  { key: "inaugurada", label: "Inaugurada", desc: "Loja liberada pelo checklist final ou marcada como inaugurada no funil." },
] as const;

// Etapas da planilha (Funil 2026) — ordem, agrupamento e descrições fiéis à planilha.
type PlanilhaStage = { key: string; label: string; group: string; desc: string; sub?: boolean };
const PLANILHA_STAGES: PlanilhaStage[] = [
  // Documentação
  { key: "docs", label: "Docs", group: "Documentação", desc: "Documentação inicial da loja/franqueado enviada e conferida." },
  { key: "cof", label: "COF", group: "Documentação", desc: "Circular de Oferta de Franquia entregue ao franqueado (prazo legal de 10 dias)." },
  { key: "contr_franquia", label: "Contr. Franquia", group: "Documentação", desc: "Contrato de franquia assinado entre franqueado e franqueadora." },
  { key: "contrato_locacao", label: "Contrato Locação", group: "Documentação", desc: "Contrato de locação do ponto assinado (loja de rua ou shopping)." },
  { key: "fampe", label: "FAMPE / Plano de Negócios", group: "Documentação", desc: "Plano de negócios pronto e FAMPE (garantia SEBRAE) aprovado/dispensado." },
  { key: "dre", label: "DRE", group: "Documentação", desc: "DRE projetada da loja validada." },
  { key: "conta_bancaria", label: "Conta Bancária", group: "Documentação", desc: "Conta bancária PJ aberta e vinculada ao CNPJ da loja." },
  // Projetos & Obras
  { key: "projetos", label: "Projetos", group: "Projetos & Obras", desc: "Projetos arquitetônico e complementares aprovados." },
  { key: "obras", label: "Obras", group: "Projetos & Obras", desc: "Obra em execução conforme cronograma." },
  { key: "contrato_obras", label: "Contrato de Obras", group: "Projetos & Obras", desc: "Contrato com a construtora fechado e assinado." },
  // Sistemas & Meios de Pagamento
  { key: "sankya", label: "Sankya", group: "Sistemas & Pagamentos", desc: "Cadastro da loja no ERP Sankhya concluído (pedidos, filial, estoque)." },
  { key: "use", label: "USE", group: "Sistemas & Pagamentos", desc: "Cadastro/liberação no sistema USE (frente de caixa)." },
  { key: "implantacao_use", label: "Implantação USE", group: "Sistemas & Pagamentos", sub: true, desc: "Implantação técnica do USE na loja concluída (instalação, treinamento, testes)." },
  { key: "skytef", label: "Skytef", group: "Sistemas & Pagamentos", desc: "Skytef (TEF) cadastrado e ativo para as maquininhas." },
  { key: "cielo_lio", label: "Cielo / LIO", group: "Sistemas & Pagamentos", desc: "Maquininhas Cielo/LIO solicitadas, recebidas e habilitadas." },
  { key: "pix", label: "PIX", group: "Sistemas & Pagamentos", desc: "PIX configurado e testado na loja." },
  { key: "boa_vista", label: "Boa Vista", group: "Sistemas & Pagamentos", desc: "Boa Vista (consulta de crédito) contratada e liberada." },
  { key: "venda_link", label: "Venda Link", group: "Sistemas & Pagamentos", desc: "Venda por link de pagamento habilitada." },
  // Operação
  { key: "loja_apoio", label: "Loja de Apoio", group: "Operação", desc: "Loja-apoio definida para suporte operacional durante a inauguração." },
  { key: "loja_liberada", label: "Loja Liberada", group: "Operação", desc: "Loja formalmente liberada para inauguração (checklist final aprovado)." },
  { key: "grupo_wpp", label: "Grupo WPP", group: "Operação", desc: "Grupo de WhatsApp da loja criado com franqueado, equipe interna e fornecedores-chave." },
  { key: "info_sistema", label: "Info e Sistema", group: "Operação", desc: "Configurações de sistema e informações da loja cadastradas (parâmetros, impressoras, etc.)." },
  { key: "lancamento_tx", label: "Lançamento de Tx no Financeiro", group: "Operação", desc: "Taxas e faturamentos da loja lançados no financeiro." },
  { key: "produtos_cds", label: "Produtos / Informar CDs", group: "Operação", desc: "CDs de origem informados e mercadoria da inauguração faturada." },
  { key: "equipe", label: "Equipe", group: "Operação", desc: "Equipe da loja contratada e treinada." },
  { key: "mkt_loja", label: "MKT Loja / Site", group: "Operação", desc: "Ações de marketing da inauguração e cadastro da loja no site." },
  { key: "internet_telefonia", label: "Internet e Telefonia", group: "Operação", desc: "Internet e telefonia instaladas e testadas na loja." },
  { key: "ecommerce", label: "Ecommerce", group: "Operação", desc: "Loja habilitada como ponto de retirada / integração com ecommerce." },
  // Entrega Final
  { key: "itens_pendentes", label: "Itens Pendentes (Checklist)", group: "Entrega Final", desc: "Todos os itens pendentes do checklist de inauguração resolvidos." },
  { key: "marcenaria", label: "Marcenaria e Status", group: "Entrega Final", desc: "Marcenaria entregue e instalada; status final validado." },
  { key: "sacolas", label: "Aquisição Sacolas Trapézio", group: "Entrega Final", desc: "Sacolas trapézio adquiridas e entregues à loja." },
];

// Agrupa mantendo a ordem original
const STAGE_GROUPS = PLANILHA_STAGES.reduce<{ name: string; stages: PlanilhaStage[] }[]>((acc, s) => {
  const last = acc[acc.length - 1];
  if (last && last.name === s.group) last.stages.push(s);
  else acc.push({ name: s.group, stages: [s] });
  return acc;
}, []);

type AutoKey = typeof AUTO_PHASES[number]["key"];

function computeAutoFlags(store: any, inauguradaInPipeline: boolean): Record<AutoKey, boolean> {
  const visitaCount = store.visitaTecnica ? Object.keys(store.visitaTecnica).length : 0;
  const solicitCount = store.solicitacoes ? Object.keys(store.solicitacoes).length : 0;
  const preObraDone = visitaCount > 0 || solicitCount > 0;

  const checklistItems = Object.values(store.checklist || {});
  const obraStarted = checklistItems.some((i: any) => i?.status && i.status !== "NÃO INICIADO");
  const allChecklistDone =
    checklistItems.length > 0 &&
    checklistItems.every((i: any) => i?.status === "REALIZADO" || i?.status === "NÃO SE APLICA");
  const obraDone = obraStarted && allChecklistDone;

  const inaugRaw: any = store.inauguracaoChecklist;
  let checklistFinalDone = false;
  if (inaugRaw && typeof inaugRaw === "object") {
    const rounds = inaugRaw.rounds;
    if (Array.isArray(rounds) && rounds.length > 0) {
      checklistFinalDone = rounds.some((r: any) => r?.items && Object.keys(r.items).length > 0);
    } else if (Object.keys(inaugRaw).length > 0) {
      checklistFinalDone = true;
    }
  }

  const inauguradaDone =
    inauguradaInPipeline || isStoreLiberated(store.inauguracaoChecklist, store.tipoLoja);

  return {
    funil: true,
    preobra: preObraDone,
    obra: obraDone,
    checklist: checklistFinalDone,
    inaugurada: inauguradaDone,
  };
}

export default function MatrizEtapas() {
  const { stores, loading } = useStores();
  const [pipelineInaug, setPipelineInaug] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [stageStatus, setStageStatus] = useState<Record<string, Record<string, boolean>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("pipeline_stores")
        .select("local, filial, status_geral")
        .is("deleted_at", null);
      const set = new Set<string>();
      (data || []).forEach((r: any) => {
        if ((r.status_geral || "").toString().toLowerCase().startsWith("inaugurada")) {
          [r.local, r.filial].filter(Boolean).forEach((v: string) =>
            set.add(v.toString().trim().toLowerCase())
          );
        }
      });
      setPipelineInaug(set);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stores").select("id, stage_status");
      const map: Record<string, Record<string, boolean>> = {};
      (data || []).forEach((r: any) => {
        map[r.id] = (r.stage_status && typeof r.stage_status === "object") ? r.stage_status : {};
      });
      setStageStatus(map);
    })();
  }, []);

  const toggle = async (storeId: string, stageKey: string) => {
    const current = stageStatus[storeId] || {};
    const next = { ...current, [stageKey]: !current[stageKey] };
    setStageStatus((s) => ({ ...s, [storeId]: next }));
    setSaving(storeId + stageKey);
    const { error } = await supabase.from("stores").update({ stage_status: next }).eq("id", storeId);
    setSaving(null);
    if (error) {
      toast.error("Erro ao salvar etapa");
      setStageStatus((s) => ({ ...s, [storeId]: current }));
    }
  };

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return stores
      .filter((s) => !q || s.nome.toLowerCase().includes(q) || (s.filial || "").toLowerCase().includes(q))
      .map((s) => {
        const inPipeline =
          pipelineInaug.has((s.nome || "").trim().toLowerCase()) ||
          pipelineInaug.has((s.filial || "").trim().toLowerCase());
        return { store: s, flags: computeAutoFlags(s, inPipeline) };
      })
      .filter((r) => !r.flags.inaugurada)
      .sort((a, b) => a.store.nome.localeCompare(b.store.nome, "pt-BR"));
  }, [stores, pipelineInaug, search]);

  const autoTotals = useMemo(() => {
    const t: Record<AutoKey, number> = { funil: 0, preobra: 0, obra: 0, checklist: 0, inaugurada: 0 };
    rows.forEach((r) => AUTO_PHASES.forEach((p) => { if (r.flags[p.key]) t[p.key]++; }));
    return t;
  }, [rows]);

  const planilhaTotals = useMemo(() => {
    const t: Record<string, number> = {};
    PLANILHA_STAGES.forEach((s) => { t[s.key] = 0; });
    rows.forEach((r) => {
      const st = stageStatus[r.store.id] || {};
      PLANILHA_STAGES.forEach((s) => { if (st[s.key]) t[s.key]++; });
    });
    return t;
  }, [rows, stageStatus]);

  const totalStages = AUTO_PHASES.length + PLANILHA_STAGES.length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="p-4 sm:p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Matriz de Etapas</h1>
          <p className="text-sm text-muted-foreground">
            Fases automáticas (calculadas pelo sistema) + etapas da planilha do Funil (clique para marcar/desmarcar). Passe o mouse sobre qualquer coluna ou marca para ver o significado.
          </p>
        </div>

        {/* Legenda */}
        <Card className="bg-muted/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
              <div className="flex items-center gap-2 font-medium">
                <Info className="h-4 w-4 text-muted-foreground" /> Legenda
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(142,60%,45%)] text-white border border-[hsl(142,60%,45%)]">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span>Etapa concluída</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground border border-border">
                  <Minus className="h-3 w-3" />
                </span>
                <span>Etapa pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded bg-muted/40 border" />
                <span><span className="font-medium">Fases (auto):</span> marcadas pelo sistema conforme o avanço da loja.</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 rounded bg-background border" />
                <span><span className="font-medium">Etapas da planilha:</span> clique para marcar/desmarcar manualmente.</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <span>↳ Subetapa</span>
                <span>de uma etapa principal (ex.: Implantação USE → USE)</span>
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">X/Y</span> abaixo de cada coluna = lojas concluídas / total em andamento.
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">
                {rows.length} loja{rows.length !== 1 ? "s" : ""} em andamento
              </CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar loja ou filial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Carregando...</div>
            ) : rows.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Nenhuma loja encontrada.</div>
            ) : (
              <Table>
                <TableHeader>
                  {/* Linha de grupos */}
                  <TableRow>
                    <TableHead rowSpan={2} className="sticky left-0 bg-background z-10 min-w-[220px] align-bottom">Loja</TableHead>
                    <TableHead colSpan={AUTO_PHASES.length} className="text-center bg-muted/60 text-[11px] uppercase tracking-wide border-l">
                      Fases (auto)
                    </TableHead>
                    {STAGE_GROUPS.map((g) => (
                      <TableHead
                        key={g.name}
                        colSpan={g.stages.length}
                        className="text-center text-[11px] uppercase tracking-wide bg-muted/30 border-l"
                      >
                        {g.name}
                      </TableHead>
                    ))}
                    <TableHead rowSpan={2} className="text-center whitespace-nowrap align-bottom border-l">Progresso</TableHead>
                  </TableRow>
                  {/* Linha de etapas */}
                  <TableRow>
                    {AUTO_PHASES.map((p, i) => (
                      <TableHead key={p.key} className={cn("text-center whitespace-nowrap bg-muted/40", i === 0 && "border-l")}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help underline decoration-dotted underline-offset-2">{p.label}</span>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="font-semibold">{p.label} (automática)</div>
                            <div className="text-xs mt-1">{p.desc}</div>
                          </TooltipContent>
                        </Tooltip>
                        <div className="text-[10px] font-normal text-muted-foreground">
                          {autoTotals[p.key]}/{rows.length}
                        </div>
                      </TableHead>
                    ))}
                    {STAGE_GROUPS.map((g) =>
                      g.stages.map((s, i) => (
                        <TableHead
                          key={s.key}
                          className={cn(
                            "text-center whitespace-nowrap",
                            i === 0 && "border-l",
                            s.sub && "bg-muted/10"
                          )}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={cn("text-[11px] cursor-help underline decoration-dotted underline-offset-2", s.sub && "pl-2 italic text-muted-foreground")}>
                                {s.sub ? "↳ " : ""}{s.label}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.name}</div>
                              <div className="font-semibold">{s.label}{s.sub && " (subetapa)"}</div>
                              <div className="text-xs mt-1">{s.desc}</div>
                            </TooltipContent>
                          </Tooltip>
                          <div className="text-[10px] font-normal text-muted-foreground">
                            {planilhaTotals[s.key]}/{rows.length}
                          </div>
                        </TableHead>
                      ))
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ store, flags }) => {
                    const st = stageStatus[store.id] || {};
                    const autoDone = AUTO_PHASES.filter((p) => flags[p.key]).length;
                    const planDone = PLANILHA_STAGES.filter((s) => st[s.key]).length;
                    const done = autoDone + planDone;
                    return (
                      <TableRow key={store.id}>
                        <TableCell className="sticky left-0 bg-background font-medium">
                          <Link to={`/loja/${store.id}`} className="hover:underline">
                            {store.nome}
                          </Link>
                          {store.filial && (
                            <div className="text-[11px] text-muted-foreground">{store.filial}</div>
                          )}
                        </TableCell>
                        {AUTO_PHASES.map((p, i) => (
                          <TableCell key={p.key} className={cn("text-center bg-muted/20", i === 0 && "border-l")}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  className={cn(
                                    "inline-flex h-7 w-7 items-center justify-center rounded-full border cursor-help",
                                    flags[p.key]
                                      ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                      : "bg-muted text-muted-foreground border-border"
                                  )}
                                >
                                  {flags[p.key] ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                <div className="font-semibold">{store.nome} — {p.label}</div>
                                <div className="text-xs mt-1">
                                  {flags[p.key] ? "✅ Concluída automaticamente pelo sistema." : "⏳ Pendente — critério ainda não atendido."}
                                </div>
                                <div className="text-xs mt-1 text-muted-foreground">{p.desc}</div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        ))}
                        {STAGE_GROUPS.map((g) =>
                          g.stages.map((s, i) => {
                            const cellDone = !!st[s.key];
                            const isSaving = saving === store.id + s.key;
                            return (
                              <TableCell
                                key={s.key}
                                className={cn("text-center", i === 0 && "border-l", s.sub && "bg-muted/10")}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      disabled={isSaving}
                                      onClick={() => toggle(store.id, s.key)}
                                      className={cn(
                                        "inline-flex h-7 w-7 items-center justify-center rounded-full border transition hover:scale-110",
                                        cellDone
                                          ? "bg-[hsl(142,60%,45%)] text-white border-[hsl(142,60%,45%)]"
                                          : "bg-background text-muted-foreground border-border hover:bg-muted",
                                        isSaving && "opacity-50"
                                      )}
                                    >
                                      {cellDone ? <Check className="h-4 w-4" /> : <Minus className="h-3 w-3" />}
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs">
                                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{g.name}</div>
                                    <div className="font-semibold">{store.nome} — {s.label}</div>
                                    <div className="text-xs mt-1">
                                      {cellDone ? "✅ Concluída — clique para desmarcar." : "⏳ Pendente — clique para marcar como concluída."}
                                    </div>
                                    <div className="text-xs mt-1 text-muted-foreground">{s.desc}</div>
                                  </TooltipContent>
                                </Tooltip>
                              </TableCell>
                            );
                          })
                        )}
                        <TableCell className="text-center text-sm tabular-nums whitespace-nowrap border-l">
                          {done}/{totalStages}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
