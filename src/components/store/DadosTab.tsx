import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Store } from "@/data/checklistData";

interface Props {
  store: Store;
  canEdit: boolean;
  onUpdate: (patch: Partial<Store>) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    {children}
  </div>
);

export default function DadosTab({ store, canEdit, onUpdate }: Props) {
  const upd = (patch: Partial<Store>) => onUpdate(patch);
  const isShopping = (store.tipoLoja || "").toLowerCase() === "shopping";

  return (
    <div className="space-y-4">
      {/* Cadastro principal */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <div>
          <h3 className="text-lg font-semibold">Identificação</h3>
          <p className="text-sm text-muted-foreground">Informações mestre. Edições aparecem em todos os módulos.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Nome">
            <Input value={store.nome} disabled={!canEdit} onChange={(e) => upd({ nome: e.target.value })} />
          </Field>
          <Field label="Filial">
            <Input value={store.filial || ""} disabled={!canEdit} onChange={(e) => upd({ filial: e.target.value })} />
          </Field>
          <Field label="Marca">
            <Input value={store.marca || ""} disabled={!canEdit} onChange={(e) => upd({ marca: e.target.value } as any)} placeholder="Ex.: Constance, Light, Outlet" />
          </Field>
          <Field label="Tipo de Loja">
            <Select value={(store.tipoLoja as any) || ""} disabled={!canEdit} onValueChange={(v) => upd({ tipoLoja: v } as any)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rua">Rua</SelectItem>
                <SelectItem value="shopping">Shopping</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          {isShopping && (
            <Field label="Nome do Shopping">
              <Input value={store.shoppingNome || ""} disabled={!canEdit} onChange={(e) => upd({ shoppingNome: e.target.value } as any)} />
            </Field>
          )}
          <Field label="Porte">
            <Input value={store.porte || ""} disabled={!canEdit} onChange={(e) => upd({ porte: e.target.value } as any)} placeholder="Tradicional, Light, Outlet…" />
          </Field>
          <Field label="Metragem (m²)">
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={store.metragemM2 ?? ""}
              disabled={!canEdit}
              onChange={(e) => upd({ metragemM2: e.target.value === "" ? null : Number(e.target.value) } as any)}
            />
          </Field>
        </div>
      </section>

      {/* Pessoas */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Pessoas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Franqueado">
            <Input value={store.franqueado || ""} disabled={!canEdit} onChange={(e) => upd({ franqueado: e.target.value })} />
          </Field>
          <Field label="Construtor">
            <Input value={store.construtor || ""} disabled={!canEdit} onChange={(e) => upd({ construtor: e.target.value })} />
          </Field>
          <Field label="Analista de Obra">
            <Input value={store.analistaObra || ""} disabled={!canEdit} onChange={(e) => upd({ analistaObra: e.target.value })} />
          </Field>
        </div>
      </section>

      {/* Endereço */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Endereço & Localização</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Endereço">
            <Input value={store.endereco || ""} disabled={!canEdit} onChange={(e) => upd({ endereco: e.target.value } as any)} placeholder="Rua, número, complemento" />
          </Field>
          <Field label="Cidade">
            <Input value={store.cidade || ""} disabled={!canEdit} onChange={(e) => upd({ cidade: e.target.value } as any)} />
          </Field>
          <Field label="UF">
            <Input value={store.uf || ""} disabled={!canEdit} maxLength={2} onChange={(e) => upd({ uf: e.target.value.toUpperCase() } as any)} />
          </Field>
          <Field label="CEP">
            <Input value={store.cep || ""} disabled={!canEdit} onChange={(e) => upd({ cep: e.target.value } as any)} />
          </Field>
          <Field label="Localização (referência)">
            <Input value={store.localizacao || ""} disabled={!canEdit} onChange={(e) => upd({ localizacao: e.target.value } as any)} placeholder="Bairro, região, piso do shopping…" />
          </Field>
        </div>
      </section>

      {/* Fiscal / Contato */}
      <section className="rounded-xl border bg-card p-6 space-y-4">
        <h3 className="text-lg font-semibold">Fiscal & Contato</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Razão Social">
            <Input value={store.razaoSocial || ""} disabled={!canEdit} onChange={(e) => upd({ razaoSocial: e.target.value } as any)} />
          </Field>
          <Field label="CNPJ">
            <Input value={store.cnpj || ""} disabled={!canEdit} onChange={(e) => upd({ cnpj: e.target.value } as any)} />
          </Field>
          <Field label="Telefone">
            <Input value={store.telefone || ""} disabled={!canEdit} onChange={(e) => upd({ telefone: e.target.value } as any)} />
          </Field>
          <Field label="E-mail da Loja">
            <Input type="email" value={store.emailLoja || ""} disabled={!canEdit} onChange={(e) => upd({ emailLoja: e.target.value } as any)} />
          </Field>
        </div>
      </section>

      {/* Observações */}
      <section className="rounded-xl border bg-card p-6 space-y-3">
        <h3 className="text-lg font-semibold">Observações Gerais</h3>
        <Textarea
          rows={4}
          value={store.observacoesGerais || ""}
          disabled={!canEdit}
          onChange={(e) => upd({ observacoesGerais: e.target.value } as any)}
          placeholder="Anotações internas sobre a loja (contexto, particularidades, riscos)…"
          className="whitespace-pre-line"
        />
      </section>
    </div>
  );
}
