import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ITENS_NAO_CONTRATADOS = [
  "Construtora / mão de obra",
  "Marcenaria (móveis)",
  "Piso / porcelanato",
  "Elétrica",
  "Ar condicionado (equipamento)",
  "Fachada / letreiro",
  "Portão automático",
  "Vidros / espelhos",
  "Informática / TI / câmeras",
  "Antifurto (Checkpoint)",
  "Virtual Gate (contador de fluxo)",
  "Kit VM / marketing",
];

type LojaBasic = {
  id: string;
  nome: string;
  filial: string | null;
  analista_obra: string | null;
};

export default function AtualizacaoRapida() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loja, setLoja] = useState<LojaBasic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [autorNome, setAutorNome] = useState<string>("");

  const [progresso, setProgresso] = useState<number>(0);
  const [situacao, setSituacao] = useState("");
  const [temBloqueio, setTemBloqueio] = useState(false);
  const [bloqueioDesc, setBloqueioDesc] = useState("");
  const [naoContratados, setNaoContratados] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("stores")
        .select("id, nome, filial, analista_obra")
        .eq("id", id)
        .is("deleted_at", null)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
      } else {
        setLoja(data as LojaBasic);
      }
      setLoading(false);
    })();
  }, [id]);

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

  const canSave = useMemo(() => {
    if (!situacao.trim()) return false;
    if (temBloqueio && !bloqueioDesc.trim()) return false;
    return true;
  }, [situacao, temBloqueio, bloqueioDesc]);

  async function handleSave() {
    if (!user || !loja || !canSave) return;
    setSaving(true);

    const marcados = Object.entries(naoContratados)
      .filter(([, v]) => v)
      .map(([k]) => k);

    const texto = [
      `[ATUALIZAÇÃO] Progresso: ${progresso}%`,
      `Situação: ${situacao.trim()}`,
      `Bloqueio: ${temBloqueio ? `Sim: ${bloqueioDesc.trim()}` : "Não"}`,
      `Não contratado: ${marcados.length ? marcados.join(", ") : "Nenhum"}`,
    ].join(" | ");

    const { error: insertErr } = await supabase.from("store_updates").insert({
      store_id: loja.id,
      texto,
      autor_nome: autorNome,
      autor_user_id: user.id,
    });

    if (insertErr) {
      setSaving(false);
      toast.error(`Erro ao salvar: ${insertErr.message}`);
      return;
    }

    const situacaoCurta = situacao.trim().slice(0, 200);
    const faseCurta = situacao.trim().slice(0, 100);
    const { error: updErr } = await supabase
      .from("stores")
      .update({
        ultima_atualizacao: situacaoCurta,
        ultima_atualizacao_at: new Date().toISOString(),
        ultima_atualizacao_autor: autorNome,
        fase_atual: faseCurta,
      } as any)
      .eq("id", loja.id);

    setSaving(false);

    if (updErr) {
      toast.error(`Atualização registrada, mas erro ao atualizar loja: ${updErr.message}`);
    } else {
      toast.success("Atualização salva com sucesso!");
    }
    navigate(`/loja/${loja.id}`);
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Carregando loja...
      </div>
    );
  }

  if (notFound || !loja) {
    return (
      <div className="max-w-lg mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-lg font-semibold">Loja não encontrada</div>
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-4">
      <div className="space-y-1">
        <div className="text-2xl font-bold leading-tight">{loja.nome}</div>
        <div className="text-sm text-muted-foreground">
          {loja.filial ? `Filial ${loja.filial}` : "Sem filial"}
        </div>
        {loja.analista_obra && (
          <Badge variant="secondary" className="mt-1">
            Analista: {loja.analista_obra}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Avanço físico da obra hoje</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4">
            <Slider
              value={[progresso]}
              onValueChange={(v) => setProgresso(v[0] ?? 0)}
              min={0}
              max={100}
              step={5}
              className="flex-1"
            />
            <div className="w-16 text-right font-semibold tabular-nums">{progresso}%</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Situação atual</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={situacao}
            onChange={(e) => setSituacao(e.target.value.slice(0, 500))}
            placeholder="Ex: Elétrica concluída, drywall em andamento. Marceneiro previsto para dia 15."
            rows={5}
          />
          <div className="text-[11px] text-muted-foreground text-right mt-1">
            {situacao.length}/500
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Existe algum bloqueio agora?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Switch checked={temBloqueio} onCheckedChange={setTemBloqueio} id="tem-bloqueio" />
            <Label htmlFor="tem-bloqueio">{temBloqueio ? "Sim" : "Não"}</Label>
          </div>
          {temBloqueio && (
            <div className="space-y-1">
              <Label htmlFor="bloqueio-desc">Descreva o bloqueio</Label>
              <Textarea
                id="bloqueio-desc"
                value={bloqueioDesc}
                onChange={(e) => setBloqueioDesc(e.target.value)}
                placeholder="Ex: Marcenaria não contratada. Vidros atrasados. Shopping sem aprovação do projeto."
                rows={3}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">O que ainda não foi contratado?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {ITENS_NAO_CONTRATADOS.map((item) => {
              const checked = !!naoContratados[item];
              return (
                <label
                  key={item}
                  className="flex items-center gap-2 rounded border p-2 cursor-pointer hover:bg-muted/40"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) =>
                      setNaoContratados((prev) => ({ ...prev, [item]: !!v }))
                    }
                  />
                  <span className="text-sm">{item}</span>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-2 pb-6">
        <Button
          size="lg"
          className="flex-1"
          onClick={handleSave}
          disabled={!canSave || saving}
        >
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar atualização
        </Button>
        <Button
          size="lg"
          variant="outline"
          onClick={() => navigate(`/loja/${loja.id}`)}
          disabled={saving}
        >
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    </div>
  );
}
