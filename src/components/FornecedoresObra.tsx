import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Phone, Mail, MessageCircle, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Fornecedor {
  id: string;
  produto: string;
  empresa: string;
  contato: string;
  telefone: string;
  whatsapp: string;
  email: string;
}

const FornecedoresObra = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [filterProduto, setFilterProduto] = useState<string | null>(null);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newForm, setNewForm] = useState({
    produto: "", empresa: "", contato: "", telefone: "", whatsapp: "", email: "",
  });
  const [saving, setSaving] = useState(false);

  const fetchFornecedores = async () => {
    const { data, error } = await supabase
      .from("fornecedores_homologados")
      .select("id, produto, empresa, contato, telefone, whatsapp, email")
      .order("produto");
    if (!error && data) setFornecedores(data);
    setLoading(false);
  };

  useEffect(() => { fetchFornecedores(); }, []);

  const produtos = [...new Set(fornecedores.map((f) => f.produto))];

  const filtered = fornecedores.filter((f) => {
    const matchSearch =
      !search ||
      f.produto.toLowerCase().includes(search.toLowerCase()) ||
      f.empresa.toLowerCase().includes(search.toLowerCase()) ||
      f.contato.toLowerCase().includes(search.toLowerCase());
    const matchProduto = !filterProduto || f.produto === filterProduto;
    return matchSearch && matchProduto;
  });

  const handleAdd = async () => {
    if (!newForm.empresa.trim() || !newForm.produto.trim()) {
      toast.error("Produto e Empresa são obrigatórios");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("fornecedores_homologados").insert({
      ...newForm,
      user_id: user?.id,
    });
    setSaving(false);
    if (error) {
      toast.error("Erro ao cadastrar fornecedor");
      return;
    }
    toast.success("Fornecedor cadastrado!");
    setNewForm({ produto: "", empresa: "", contato: "", telefone: "", whatsapp: "", email: "" });
    setShowAddDialog(false);
    fetchFornecedores();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("fornecedores_homologados").delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    toast.success("Fornecedor removido");
    fetchFornecedores();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fornecedores Homologados</h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{filtered.length} fornecedor(es)</Badge>
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-1" /> Novo
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por produto, empresa ou contato..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Product filter */}
      <div className="flex flex-wrap gap-1.5">
        <Button
          variant={filterProduto === null ? "default" : "outline"}
          size="sm"
          className="text-xs"
          onClick={() => setFilterProduto(null)}
        >
          Todos
        </Button>
        {produtos.map((p) => (
          <Button
            key={p}
            variant={filterProduto === p ? "default" : "outline"}
            size="sm"
            className="text-xs"
            onClick={() => setFilterProduto(filterProduto === p ? null : p)}
          >
            {p}
          </Button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead>E-mail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] whitespace-nowrap">{f.produto}</Badge>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{f.empresa}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{f.contato || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {f.telefone || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {f.whatsapp && (
                          <a href={`https://wa.me/${f.whatsapp}`} target="_blank" rel="noopener noreferrer">
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-[hsl(152,60%,40%)]">
                              <MessageCircle className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        {f.telefone && (
                          <a href={`tel:${f.telefone}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Phone className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        {f.email && (
                          <a href={`mailto:${f.email}`}>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDelete(f.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                      {f.email || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar Fornecedor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Produto / Categoria *</Label>
              <Input value={newForm.produto} onChange={(e) => setNewForm({ ...newForm, produto: e.target.value })} placeholder="Ex: Mobiliário/Puffs" />
            </div>
            <div>
              <Label>Empresa *</Label>
              <Input value={newForm.empresa} onChange={(e) => setNewForm({ ...newForm, empresa: e.target.value })} />
            </div>
            <div>
              <Label>Contato</Label>
              <Input value={newForm.contato} onChange={(e) => setNewForm({ ...newForm, contato: e.target.value })} />
            </div>
            <div>
              <Label>Telefone</Label>
              <Input value={newForm.telefone} onChange={(e) => setNewForm({ ...newForm, telefone: e.target.value })} placeholder="(XX) XXXXX-XXXX" />
            </div>
            <div>
              <Label>WhatsApp (só números com DDI)</Label>
              <Input value={newForm.whatsapp} onChange={(e) => setNewForm({ ...newForm, whatsapp: e.target.value })} placeholder="55XXXXXXXXXXX" />
            </div>
            <div>
              <Label>E-mail</Label>
              <Input value={newForm.email} onChange={(e) => setNewForm({ ...newForm, email: e.target.value })} type="email" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancelar</Button>
            <Button onClick={handleAdd} disabled={saving}>{saving ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FornecedoresObra;
