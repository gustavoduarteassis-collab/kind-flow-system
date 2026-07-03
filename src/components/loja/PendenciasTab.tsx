import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, CheckCircle2, Bell, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  usePendencias, AGUARDANDO_LABEL, STATUS_LABEL,
  type Pendencia, type PendenciaAguardando, type PendenciaStatus, type PendenciaInput,
} from "@/hooks/usePendencias";

const ANALISTAS = ["Deise", "Thainara", "Gizelia", "Gustavo"];
const AGUARDANDO_OPTS: PendenciaAguardando[] = ["franqueado","juridico","fornecedor","shopping","interno"];

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("pt-BR");
}

function daysSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export default function PendenciasTab({
  storeId,
  defaultResponsavel,
}: {
  storeId: string;
  defaultResponsavel?: string | null;
}) {
  const { pendencias, loading, create, update, remove } = usePendencias(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Pendencia | null>(null);

  const abertas = pendencias.filter(p => p.status === "aberta");
  const cobradas = pendencias.filter(p => p.status === "cobrada");
  const resolvidas = pendencias.filter(p => p.status === "resolvida");

  const openNew = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (p: Pendencia) => { setEditing(p); setDialogOpen(true); };

  const handleSubmit = async (input: PendenciaInput) => {
    const { error } = editing
      ? await update(editing.id, input)
      : await create(input);
    if (error) toast.error("Erro ao salvar", { description: error });
    else {
      toast.success(editing ? "Pendência atualizada" : "Pendência criada");
      setDialogOpen(false);
    }
  };

  const handleStatus = async (p: Pendencia, status: PendenciaStatus) => {
    const { error } = await update(p.id, { status });
    if (error) toast.error("Erro", { description: error });
    else toast.success(`Marcada como ${STATUS_LABEL[status].toLowerCase()}`);
  };

  const handleDelete = async (p: Pendencia) => {
    if (!confirm("Remover esta pendência?")) return;
    const { error } = await remove(p.id);
    if (error) toast.error("Erro", { description: error });
    else toast.success("Removida");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Pendências</h3>
          <p className="text-xs text-muted-foreground">
            {abertas.length} aberta(s) · {cobradas.length} cobrada(s) · {resolvidas.length} resolvida(s)
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openNew}>
              <Plus className="h-4 w-4 mr-1" /> Nova pendência
            </Button>
          </DialogTrigger>
          <PendenciaForm
            key={editing?.id || "new"}
            editing={editing}
            defaultResponsavel={defaultResponsavel}
            onSubmit={handleSubmit}
            onCancel={() => setDialogOpen(false)}
          />
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : pendencias.length === 0 ? (
        <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">
          Nenhuma pendência cadastrada.
        </CardContent></Card>
      ) : (
        <>
          <Section title="Abertas" items={abertas} onEdit={openEdit} onDelete={handleDelete} onStatus={handleStatus} />
          <Section title="Cobradas" items={cobradas} onEdit={openEdit} onDelete={handleDelete} onStatus={handleStatus} />
          <Section title="Resolvidas" items={resolvidas} onEdit={openEdit} onDelete={handleDelete} onStatus={handleStatus} collapsedByDefault />
        </>
      )}
    </div>
  );
}

function Section({
  title, items, onEdit, onDelete, onStatus, collapsedByDefault,
}: {
  title: string;
  items: Pendencia[];
  onEdit: (p: Pendencia) => void;
  onDelete: (p: Pendencia) => void;
  onStatus: (p: Pendencia, s: PendenciaStatus) => void;
  collapsedByDefault?: boolean;
}) {
  const [open, setOpen] = useState(!collapsedByDefault);
  if (items.length === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground font-semibold py-1"
      >
        <span>{title} ({items.length})</span>
        <span>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="space-y-2">
          {items.map(p => (
            <Card key={p.id}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm whitespace-pre-line flex-1">{p.descricao}</p>
                  <div className="flex gap-1 shrink-0">
                    {p.status !== "resolvida" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStatus(p, "resolvida")} title="Marcar resolvida">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      </Button>
                    )}
                    {p.status === "aberta" && (
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onStatus(p, "cobrada")} title="Marcar cobrada">
                        <Bell className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onDelete(p)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline">Aguardando: {AGUARDANDO_LABEL[p.aguardando_quem]}</Badge>
                  {p.responsavel_interno && <Badge variant="outline">Resp: {p.responsavel_interno}</Badge>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />
                    {p.status === "resolvida"
                      ? `Resolvida ${formatDate(p.resolvido_em)}`
                      : `Aberta há ${daysSince(p.criado_em)}d (${formatDate(p.criado_em)})`}
                  </span>
                  {p.prazo_cobranca && <span>Prazo: {formatDate(p.prazo_cobranca)}</span>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function PendenciaForm({
  editing, defaultResponsavel, onSubmit, onCancel,
}: {
  editing: Pendencia | null;
  defaultResponsavel?: string | null;
  onSubmit: (input: PendenciaInput) => void;
  onCancel: () => void;
}) {
  const [descricao, setDescricao] = useState(editing?.descricao || "");
  const [aguardando, setAguardando] = useState<PendenciaAguardando>(editing?.aguardando_quem || "franqueado");
  const [responsavel, setResponsavel] = useState(editing?.responsavel_interno || defaultResponsavel || "");
  const [prazo, setPrazo] = useState(editing?.prazo_cobranca || "");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!descricao.trim()) { toast.error("Descrição obrigatória"); return; }
    setSaving(true);
    await onSubmit({
      descricao,
      aguardando_quem: aguardando,
      responsavel_interno: responsavel || null,
      prazo_cobranca: prazo || null,
    });
    setSaving(false);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle>{editing ? "Editar pendência" : "Nova pendência"}</DialogTitle>
      </DialogHeader>
      <div className="space-y-3">
        <div>
          <Label>Descrição</Label>
          <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={3} maxLength={500} placeholder="Ex.: Aguardando envio do contrato assinado pelo franqueado." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Aguardando quem</Label>
            <Select value={aguardando} onValueChange={(v) => setAguardando(v as PendenciaAguardando)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {AGUARDANDO_OPTS.map(o => <SelectItem key={o} value={o}>{AGUARDANDO_LABEL[o]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Responsável interno</Label>
            <Select value={responsavel || "__none"} onValueChange={(v) => setResponsavel(v === "__none" ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">— nenhum —</SelectItem>
                {ANALISTAS.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Prazo de cobrança (opcional)</Label>
          <Input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button onClick={submit} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
      </DialogFooter>
    </DialogContent>
  );
}
