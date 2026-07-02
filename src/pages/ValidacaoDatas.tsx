import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, GitCompare } from "lucide-react";
import { toast } from "sonner";

type SyncMismatch = {
  store_id: string;
  pipeline_id: string;
  nome: string;
  campo: "Previsão de inauguração" | "Data de inauguração";
  painel: string | null;
  funil: string | null;
};

type Row = {
  id: string;
  filial: string | null;
  local: string | null;
  previsao_inauguracao: string | null;
  data_inauguracao: string | null;
  motivo: string;
};

const MIN_YEAR = 2020;
const MAX_YEAR = 2035;

// Accept DD/MM/YY, DD/MM/YYYY or YYYY-MM-DD. Returns issue description or null if OK.
function validate(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null; // vazio é permitido (não é erro de formato)

  // ISO
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (iso) {
    const y = +iso[1], m = +iso[2], d = +iso[3];
    return validParts(d, m, y);
  }

  // DD/MM/YY(YY)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(raw);
  if (br) {
    const d = +br[1], m = +br[2];
    let y = +br[3];
    if (br[3].length === 2) y += 2000;
    return validParts(d, m, y);
  }

  return `Formato inválido: "${raw}" (use DD/MM/AAAA)`;
}

function validParts(d: number, m: number, y: number): string | null {
  if (m < 1 || m > 12) return `Mês inválido (${m})`;
  if (d < 1 || d > 31) return `Dia inválido (${d})`;
  if (y < MIN_YEAR || y > MAX_YEAR) return `Ano fora do intervalo (${y})`;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) {
    return `Data inexistente (${d.toString().padStart(2, "0")}/${m.toString().padStart(2, "0")}/${y})`;
  }
  return null;
}

const ValidacaoDatas = () => {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [totalScanned, setTotalScanned] = useState(0);
  const [mismatches, setMismatches] = useState<SyncMismatch[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);


  const load = async () => {
    setLoading(true);
    setLoadError(null);
    const [{ data: pipeline, error: pErr }, { data: stores, error: sErr }] = await Promise.all([
      supabase.from("pipeline_stores").select("id, filial, local, previsao_inauguracao, data_inauguracao").is("deleted_at", null),
      supabase.from("stores").select("id, nome, inauguracao, inauguracao_real").is("deleted_at", null),
    ]);
    if (pErr || sErr) {
      const msg = (pErr || sErr)?.message || "Erro desconhecido ao carregar dados";
      console.error(pErr || sErr);
      setLoadError(msg);
      setRows([]); setMismatches([]); setLoading(false); return;
    }
    const issues: Row[] = [];
    (pipeline || []).forEach((r: any) => {
      const m1 = validate(r.previsao_inauguracao);
      const m2 = validate(r.data_inauguracao);
      const motivos: string[] = [];
      if (m1) motivos.push(`Previsão de inauguração — ${m1}`);
      if (m2) motivos.push(`Data de inauguração — ${m2}`);
      if (motivos.length) {
        issues.push({ id: r.id, filial: r.filial, local: r.local, previsao_inauguracao: r.previsao_inauguracao, data_inauguracao: r.data_inauguracao, motivo: motivos.join(" · ") });
      }
    });
    issues.sort((a, b) => (a.local || "").localeCompare(b.local || ""));

    // Sync check: pair pipeline_stores × stores by normalized name
    const toIso = (v: string | null | undefined): string | null => {
      if (!v) return null;
      const raw = String(v).trim();
      if (!raw) return null;
      const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
      if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
      const br = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(raw);
      if (br) {
        const d = br[1].padStart(2, "0"), m = br[2].padStart(2, "0");
        const y = br[3].length === 2 ? String(2000 + +br[3]) : br[3];
        return `${y}-${m}-${d}`;
      }
      return raw;
    };
    const slug = (s: string | null | undefined) =>
      (s || "").toString().split("\n")[0].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

    const storeMap = new Map<string, any>();
    (stores || []).forEach((s: any) => {
      const k = slug(s.nome);
      if (k) storeMap.set(k, s);
    });

    const mm: SyncMismatch[] = [];
    (pipeline || []).forEach((p: any) => {
      const s = storeMap.get(slug(p.local));
      if (!s) return;
      const prevP = toIso(p.previsao_inauguracao);
      const prevS = toIso(s.inauguracao);
      const realP = toIso(p.data_inauguracao);
      const realS = toIso(s.inauguracao_real);
      if ((prevP || prevS) && prevP !== prevS) {
        mm.push({ store_id: s.id, pipeline_id: p.id, nome: (s.nome || p.local || "").split("\n")[0], campo: "Previsão de inauguração", painel: prevS, funil: prevP });
      }
      if ((realP || realS) && realP !== realS) {
        mm.push({ store_id: s.id, pipeline_id: p.id, nome: (s.nome || p.local || "").split("\n")[0], campo: "Data de inauguração", painel: realS, funil: realP });
      }
    });
    mm.sort((a, b) => a.nome.localeCompare(b.nome));

    setRows(issues);
    setMismatches(mm);
    setTotalScanned((pipeline || []).length);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sincronizar = async (m: SyncMismatch) => {
    setSyncing(true);
    const patch: any = {};
    if (m.campo === "Previsão de inauguração") patch.inauguracao = m.funil;
    else patch.inauguracao_real = m.funil;
    const { error } = await supabase.from("stores").update(patch).eq("id", m.store_id);
    setSyncing(false);
    if (error) { toast.error("Falha ao sincronizar: " + error.message); return; }
    toast.success("Painel sincronizado com o Funil");
    load();
  };

  const sincronizarTudo = async () => {
    if (mismatches.length === 0) return;
    setSyncing(true);
    for (const m of mismatches) {
      const patch: any = {};
      if (m.campo === "Previsão de inauguração") patch.inauguracao = m.funil;
      else patch.inauguracao_real = m.funil;
      await supabase.from("stores").update(patch).eq("id", m.store_id);
    }
    setSyncing(false);
    toast.success(`${mismatches.length} divergência(s) sincronizada(s)`);
    load();
  };

  const summary = useMemo(() => {
    const formato = rows.filter((r) => /Formato inválido/.test(r.motivo)).length;
    const dataInexistente = rows.filter((r) => /Data inexistente/.test(r.motivo)).length;
    const anoFora = rows.filter((r) => /Ano fora/.test(r.motivo)).length;
    return { formato, dataInexistente, anoFora };
  }, [rows]);


  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Validação de Datas</h1>
          <p className="text-xs text-muted-foreground">
            Verifica a coluna <strong>Previsão de Inauguração</strong> (e Data de Inauguração) do Funil.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Reexecutar
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Registros analisados</div><div className="text-2xl font-bold">{totalScanned}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Com problema</div><div className="text-2xl font-bold text-destructive">{rows.length}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Formato inválido</div><div className="text-2xl font-bold">{summary.formato}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">Data inexistente / ano fora</div><div className="text-2xl font-bold">{summary.dataInexistente + summary.anoFora}</div></CardContent></Card>
      </div>

      {/* Alerta permanente: Painel × Funil fora de sincronia */}
      <Card className={mismatches.length > 0 ? "border-orange-500/60 bg-orange-500/5" : "border-emerald-500/40 bg-emerald-500/5"}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <GitCompare className={`h-4 w-4 ${mismatches.length > 0 ? "text-orange-500" : "text-emerald-600"}`} />
              Sincronia Painel da Loja × Funil
              <Badge variant={mismatches.length > 0 ? "destructive" : "outline"}>
                {mismatches.length} divergência{mismatches.length === 1 ? "" : "s"}
              </Badge>
            </span>
            {mismatches.length > 0 && (
              <Button size="sm" onClick={sincronizarTudo} disabled={syncing}>
                Sincronizar tudo (usar Funil)
              </Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mismatches.length === 0 ? (
            <div className="px-4 py-3 text-xs text-muted-foreground">
              Painel da Loja e Funil estão 100% sincronizados nas datas de inauguração.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Loja</th>
                    <th className="p-3">Campo</th>
                    <th className="p-3">Painel</th>
                    <th className="p-3">Funil</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {mismatches.map((m, i) => (
                    <tr key={`${m.store_id}-${m.campo}-${i}`} className="border-t">
                      <td className="p-3">
                        <Link to={`/loja/${m.store_id}`} className="text-primary underline">{m.nome}</Link>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">{m.campo}</td>
                      <td className="p-3"><Badge variant="outline">{m.painel || "vazio"}</Badge></td>
                      <td className="p-3"><Badge>{m.funil || "vazio"}</Badge></td>
                      <td className="p-3">
                        <Button size="sm" variant="outline" disabled={syncing} onClick={() => sincronizar(m)}>
                          Usar Funil
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {!loading && rows.length === 0 && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Formato das datas OK</AlertTitle>
          <AlertDescription>Nenhuma data inválida ou fora do formato encontrada no Funil.</AlertDescription>
        </Alert>
      )}


      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Itens que precisam de correção
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="p-3">Filial</th>
                    <th className="p-3">Loja</th>
                    <th className="p-3">Previsão</th>
                    <th className="p-3">Data Inaug.</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-mono text-xs">{r.filial || "—"}</td>
                      <td className="p-3">{r.local || "—"}</td>
                      <td className="p-3"><Badge variant="outline">{r.previsao_inauguracao || "vazio"}</Badge></td>
                      <td className="p-3"><Badge variant="outline">{r.data_inauguracao || "vazio"}</Badge></td>
                      <td className="p-3 text-destructive text-xs">{r.motivo}</td>
                      <td className="p-3">
                        <Link to="/lojas?tab=funil" className="text-primary underline text-xs">Abrir Funil</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ValidacaoDatas;
