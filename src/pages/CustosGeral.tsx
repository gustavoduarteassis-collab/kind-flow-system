import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { custosGeralData, getStoreCostTotal, getStoreCostPerM2, META_POR_M2, StoreCostEntry } from "@/data/custosGeralData";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, TrendingUp, TrendingDown, Building2 } from "lucide-react";
import logoConstance from "@/assets/logo-constance.svg";

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtM2 = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 });

const CustosGeral = () => {
  const navigate = useNavigate();
  const [filterAno, setFilterAno] = useState<string>("todos");
  const [filterTipo, setFilterTipo] = useState<string>("todos");

  const filtered = useMemo(() => {
    let data = custosGeralData;
    if (filterAno !== "todos") data = data.filter((d) => d.ano === Number(filterAno));
    if (filterTipo !== "todos") data = data.filter((d) => d.tipo === filterTipo);
    return data;
  }, [filterAno, filterTipo]);

  const anos = [...new Set(custosGeralData.map((d) => d.ano))].sort();

  const totals = useMemo(() => {
    let ok = 0, over = 0;
    filtered.forEach((entry) => {
      const custoM2 = getStoreCostPerM2(entry);
      const meta = META_POR_M2[entry.tipo] || 3250;
      if (custoM2 <= meta) ok++;
      else over++;
    });
    return { ok, over, total: filtered.length };
  }, [filtered]);

  const getStatusInfo = (entry: StoreCostEntry) => {
    const custoM2 = getStoreCostPerM2(entry);
    const meta = META_POR_M2[entry.tipo] || 3250;
    const isOver = custoM2 > meta;
    return { custoM2, meta, isOver };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoConstance} alt="Logo" className="h-8 w-auto" />
            <div className="flex-1">
              <h1 className="text-xl font-bold tracking-tight">Custos Geral — Todas as Lojas</h1>
              <p className="text-sm text-muted-foreground">Análise de custos por m² desde 2024</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={filterAno} onValueChange={setFilterAno}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os anos</SelectItem>
              {anos.map((a) => (
                <SelectItem key={a} value={String(a)}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="TRADICIONAL">Tradicional</SelectItem>
              <SelectItem value="LIGHT">Light</SelectItem>
              <SelectItem value="OUTLET">Outlet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total de Lojas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {totals.total}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Dentro da Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2 text-[hsl(152,60%,40%)]">
                <TrendingDown className="h-5 w-5" />
                {totals.ok}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Acima da Meta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-2 text-destructive">
                <TrendingUp className="h-5 w-5" />
                {totals.over}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Metas por m²</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs space-y-1">
                <div>Tradicional: <span className="font-bold">{fmtM2(3250)}</span></div>
                <div>Light: <span className="font-bold">{fmtM2(3500)}</span></div>
                <div>Outlet: <span className="font-bold">{fmtM2(2900)}</span></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">#</TableHead>
                  <TableHead className="min-w-[180px]">Loja</TableHead>
                  <TableHead className="w-16 text-center">Ano</TableHead>
                  <TableHead className="w-24 text-center">Tipo</TableHead>
                  <TableHead className="w-20 text-center">Local</TableHead>
                  <TableHead className="w-20 text-right">Área m²</TableHead>
                  <TableHead className="w-28 text-right">Mão de Obra</TableHead>
                  <TableHead className="w-24 text-right">Móveis</TableHead>
                  <TableHead className="w-24 text-right">Piso</TableHead>
                  <TableHead className="w-24 text-right">Iluminação</TableHead>
                  <TableHead className="w-24 text-right">Informática</TableHead>
                  <TableHead className="w-24 text-right">Demais</TableHead>
                  <TableHead className="w-28 text-right">Total</TableHead>
                  <TableHead className="w-24 text-right">R$/m²</TableHead>
                  <TableHead className="w-24 text-right">Meta R$/m²</TableHead>
                  <TableHead className="w-20 text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry, idx) => {
                  const total = getStoreCostTotal(entry);
                  const { custoM2, meta, isOver } = getStatusInfo(entry);
                  return (
                    <TableRow
                      key={`${entry.nome}-${entry.ano}`}
                      className={isOver ? "bg-destructive/5" : "bg-[hsl(152,60%,95%)]"}
                    >
                      <TableCell className="text-center text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                      <TableCell className="font-medium text-sm">{entry.nome}</TableCell>
                      <TableCell className="text-center text-sm">{entry.ano}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">{entry.tipo}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs">{entry.local}</TableCell>
                      <TableCell className="text-right text-sm font-mono">{entry.areaTotal.toFixed(1)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.maoDeObra)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.moveis)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.piso)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.iluminacao)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.informatica)}</TableCell>
                      <TableCell className="text-right text-xs font-mono">{fmt(entry.demaisItens)}</TableCell>
                      <TableCell className="text-right text-sm font-bold font-mono">{fmt(total)}</TableCell>
                      <TableCell className={`text-right text-sm font-bold font-mono ${isOver ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>
                        {fmtM2(custoM2)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-mono text-muted-foreground">{fmtM2(meta)}</TableCell>
                      <TableCell className="text-center">
                        {isOver ? (
                          <Badge variant="destructive" className="text-[10px]">ESTOUROU</Badge>
                        ) : (
                          <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)] text-[10px]">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustosGeral;
