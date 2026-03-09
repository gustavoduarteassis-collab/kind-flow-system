import { useState } from "react";
import { fornecedoresHomologados } from "@/data/fornecedoresData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Search, Phone, Mail, MessageCircle } from "lucide-react";

const FornecedoresObra = () => {
  const [search, setSearch] = useState("");
  const [filterProduto, setFilterProduto] = useState<string | null>(null);

  const produtos = [...new Set(fornecedoresHomologados.map((f) => f.produto))];

  const filtered = fornecedoresHomologados.filter((f) => {
    const matchSearch =
      !search ||
      f.produto.toLowerCase().includes(search.toLowerCase()) ||
      f.empresa.toLowerCase().includes(search.toLowerCase()) ||
      f.contato.toLowerCase().includes(search.toLowerCase());
    const matchProduto = !filterProduto || f.produto === filterProduto;
    return matchSearch && matchProduto;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Fornecedores Homologados</h2>
        <Badge variant="outline">{filtered.length} fornecedor(es)</Badge>
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
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    Nenhum fornecedor encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((f, i) => (
                  <TableRow key={i}>
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
    </div>
  );
};

export default FornecedoresObra;
