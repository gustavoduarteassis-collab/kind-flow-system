import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useStores } from "@/hooks/useStores";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { usePageTitle } from "@/hooks/usePageTitle";

type FranchiseeAccess = {
  id: string; store_id: string; franchisee_email: string;
  can_view_checklist: boolean; can_edit_checklist: boolean;
  can_view_cronograma: boolean; can_edit_cronograma: boolean;
  can_view_diario: boolean; can_edit_diario: boolean;
  can_view_custos: boolean; can_edit_custos: boolean;
  access_type: string;
};

const emptyForm = {
  store_id: "", franchisee_email: "", access_type: "franqueado",
  can_view_checklist: true, can_edit_checklist: true,
  can_view_cronograma: true, can_edit_cronograma: true,
  can_view_diario: true, can_edit_diario: true,
  can_view_custos: true, can_edit_custos: true,
};

export default function Acessos() {
  usePageTitle("Acessos de Franqueados");
  const { user } = useAuth();
  const { stores } = useStores();
  const { toast } = useToast();
  const [items, setItems] = useState<FranchiseeAccess[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchData = useCallback(async () => {
    const { data } = await supabase.from("franchisee_access").select("*");
    if (data) setItems(data as FranchiseeAccess[]);
  }, []);
  useEffect(() => { fetchData(); }, [fetchData]);

  const getStoreName = (id: string) => stores.find((s) => s.id === id)?.nome || id;

  const addAccess = async () => {
    if (!user || !form.store_id || !form.franchisee_email) return;
    const { error } = await supabase.from("franchisee_access").insert({
      ...form, franchisee_email: form.franchisee_email.toLowerCase(), created_by: user.id,
    });
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Acesso liberado!", description: `${form.franchisee_email} já pode acessar.` });
    setForm(emptyForm); setOpen(false); fetchData();
  };

  const deleteAccess = async (id: string) => {
    await supabase.from("franchisee_access").delete().eq("id", id);
    fetchData();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><KeyRound className="h-6 w-6" /> Acessos</h1>
          <p className="text-sm text-muted-foreground">Liberação de acesso para franqueados e construtores.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Liberar Acesso</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Liberar Acesso</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2"><Label>Tipo de Acesso *</Label>
                <Select value={form.access_type} onValueChange={(v) => setForm({ ...form, access_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="franqueado">Franqueado</SelectItem>
                    <SelectItem value="construtor">Construtor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>E-mail *</Label>
                <Input type="email" value={form.franchisee_email} onChange={(e) => setForm({ ...form, franchisee_email: e.target.value })} />
              </div>
              <div className="space-y-2"><Label>Loja *</Label>
                <Select value={form.store_id} onValueChange={(v) => setForm({ ...form, store_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>{stores.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3 p-3 rounded-lg border bg-muted/30">
                {([
                  ["checklist", "Checklist"], ["cronograma", "Cronograma"],
                  ["diario", "Diário"], ["custos", "Custos"],
                ] as const).map(([key, label]) => {
                  const vKey = `can_view_${key}` as const;
                  const eKey = `can_edit_${key}` as const;
                  return (
                    <div className="space-y-2" key={key}>
                      <p className="text-xs font-medium text-muted-foreground">{label}</p>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`v-${key}`} checked={form[vKey]} onCheckedChange={(v) => setForm({ ...form, [vKey]: !!v, [eKey]: !v ? false : form[eKey] })} />
                        <Label htmlFor={`v-${key}`} className="text-xs">Visualizar</Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox id={`e-${key}`} checked={form[eKey]} disabled={!form[vKey]} onCheckedChange={(v) => setForm({ ...form, [eKey]: !!v })} />
                        <Label htmlFor={`e-${key}`} className="text-xs">Editar</Label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button onClick={addAccess} className="w-full">Liberar Acesso</Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {items.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          Nenhum franqueado com acesso liberado.
        </CardContent></Card>
      ) : (
        <Card><div className="overflow-x-auto"><Table>
          <TableHeader><TableRow>
            <TableHead>Tipo</TableHead><TableHead>E-mail</TableHead><TableHead>Loja</TableHead>
            <TableHead>Permissões</TableHead><TableHead className="w-10"></TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map((fa) => (
              <TableRow key={fa.id}>
                <TableCell><Badge className={fa.access_type === "construtor" ? "bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))]" : "bg-primary text-primary-foreground"}>{fa.access_type === "construtor" ? "Construtor" : "Franqueado"}</Badge></TableCell>
                <TableCell className="text-sm">{fa.franchisee_email}</TableCell>
                <TableCell className="text-sm font-medium">{getStoreName(fa.store_id)}</TableCell>
                <TableCell><div className="flex flex-wrap gap-1">
                  {fa.can_view_checklist && <Badge variant="outline" className="text-[10px]">Checklist {fa.can_edit_checklist ? "✏️" : "👁️"}</Badge>}
                  {fa.can_view_cronograma && <Badge variant="outline" className="text-[10px]">Cronograma {fa.can_edit_cronograma ? "✏️" : "👁️"}</Badge>}
                  {fa.can_view_diario && <Badge variant="outline" className="text-[10px]">Diário {fa.can_edit_diario ? "✏️" : "👁️"}</Badge>}
                  {fa.can_view_custos && <Badge variant="outline" className="text-[10px]">Custos {fa.can_edit_custos ? "✏️" : "👁️"}</Badge>}
                </div></TableCell>
                <TableCell><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm("Revogar acesso?")) deleteAccess(fa.id); }}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div></Card>
      )}
    </div>
  );
}
