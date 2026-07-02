import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Store } from "@/data/checklistData";
import { Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface Props {
  store: Store;
  canEdit: boolean;
  onUpdate: (patch: Partial<Store>) => void;
}

function daysBetween(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const d1 = new Date(a + "T00:00:00");
  const d2 = new Date(b + "T00:00:00");
  if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return null;
  return Math.round((d1.getTime() - d2.getTime()) / 86400000);
}

function DeviationBadge({ prev, real }: { prev?: string; real?: string }) {
  const diff = daysBetween(prev, real);
  if (diff === null) return null;
  if (diff === 0) return <Badge variant="outline" className="gap-1 text-[10px]"><Minus className="h-3 w-3" /> no prazo</Badge>;
  if (diff > 0) return <Badge className="gap-1 text-[10px] bg-[hsl(142,60%,40%)] text-white"><TrendingUp className="h-3 w-3" /> {diff}d adiantado</Badge>;
  return <Badge variant="destructive" className="gap-1 text-[10px]"><TrendingDown className="h-3 w-3" /> {Math.abs(diff)}d atrasado</Badge>;
}

function DateField({ label, value, onChange, disabled }: { label: string; value?: string; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <Input type="date" value={value || ""} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function DatePair({
  label,
  prev, real,
  prevKey, realKey,
  store, canEdit, onUpdate,
}: {
  label: string;
  prev?: string; real?: string;
  prevKey: keyof Store; realKey: keyof Store;
  store: Store; canEdit: boolean; onUpdate: (p: Partial<Store>) => void;
}) {
  return (
    <div className="rounded-lg border bg-card/60 p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm font-medium">{label}</div>
        <DeviationBadge prev={prev} real={real} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DateField
          label="Prevista"
          value={prev}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ [prevKey]: v } as any)}
        />
        <DateField
          label="Real"
          value={real}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ [realKey]: v } as any)}
        />
      </div>
    </div>
  );
}

export default function DatasTab({ store, canEdit, onUpdate }: Props) {
  return (
    <div className="rounded-xl border bg-card p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Calendar className="h-5 w-5 text-primary" />
        <div>
          <h3 className="text-lg font-semibold">Datas-chave</h3>
          <p className="text-sm text-muted-foreground">
            Marcos do ciclo. Desvio calculado automaticamente (verde = adiantado, vermelho = atrasado).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <DateField
          label="📄 Assinatura do contrato de locação"
          value={store.dataContratoLocacao}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ dataContratoLocacao: v })}
        />
        <DateField
          label="🔑 Liberação da loja (entrega das chaves)"
          value={store.dataLiberacaoChaves}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ dataLiberacaoChaves: v })}
        />
        <DateField
          label="🔍 Visita técnica realizada"
          value={store.visitaTecnicaReal}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ visitaTecnicaReal: v })}
        />
        <DateField
          label="🎉 Inauguração prevista"
          value={store.inauguracao}
          disabled={!canEdit}
          onChange={(v) => onUpdate({ inauguracao: v })}
        />
      </div>

      <div>
        <h4 className="text-sm font-semibold mb-3 uppercase tracking-wide text-muted-foreground">
          Marcos com pares Prevista / Real
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <DatePair label="🧨 Demolição" prev={store.demolicaoPrev} real={store.demolicaoReal}
            prevKey="demolicaoPrev" realKey="demolicaoReal" store={store} canEdit={canEdit} onUpdate={onUpdate} />
          <DatePair label="🏗️ Início da obra" prev={store.obraInicioPrev} real={store.obraInicioReal}
            prevKey="obraInicioPrev" realKey="obraInicioReal" store={store} canEdit={canEdit} onUpdate={onUpdate} />
          <DatePair label="🪑 Entrada de móveis/marcenaria" prev={store.moveisPrev} real={store.moveisReal}
            prevKey="moveisPrev" realKey="moveisReal" store={store} canEdit={canEdit} onUpdate={onUpdate} />
          <DatePair label="📦 Chegada dos produtos" prev={store.produtosPrev} real={store.produtosReal}
            prevKey="produtosPrev" realKey="produtosReal" store={store} canEdit={canEdit} onUpdate={onUpdate} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
        <div className="rounded-lg border bg-[hsl(142,60%,97%)] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-sm font-medium">🏁 Inauguração real</div>
            <DeviationBadge prev={store.inauguracao} real={store.inauguracaoReal} />
          </div>
          <DateField
            label="Data real de inauguração"
            value={store.inauguracaoReal}
            disabled={!canEdit}
            onChange={(v) => onUpdate({ inauguracaoReal: v })}
          />
        </div>
      </div>
    </div>
  );
}
