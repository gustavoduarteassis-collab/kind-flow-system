import { useState, useRef } from "react";
import { Store } from "@/data/checklistData";
import { CustosData, createDefaultCustos } from "@/data/custosData";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Upload, FileText, Trash2, DollarSign, Plus, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  store: Store;
  onUpdate: (custos: CustosData) => void;
}

const formatCurrency = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const parseCurrency = (v: string) => {
  const num = parseFloat(v.replace(/[^\d.,\-]/g, "").replace(",", "."));
  return isNaN(num) ? 0 : num;
};

export default function CustosObra({ store, onUpdate }: Props) {
  const custos: CustosData = (store as any).custos && (store as any).custos.categorias
    ? (store as any).custos
    : createDefaultCustos();

  const [uploading, setUploading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<{ catIdx: number; itemIdx: number } | null>(null);

  const updateItem = (catIdx: number, itemIdx: number, field: string, value: any) => {
    const updated = JSON.parse(JSON.stringify(custos)) as CustosData;
    (updated.categorias[catIdx].items[itemIdx] as any)[field] = value;
    onUpdate(updated);
  };

  const addItem = (catIdx: number) => {
    const updated = JSON.parse(JSON.stringify(custos)) as CustosData;
    const cat = updated.categorias[catIdx];
    cat.items.push({
      id: `${cat.id}-custom-${Date.now()}`,
      nome: "",
      fornecedor: "",
      valorPrevisto: 0,
      valorRealizado: 0,
      proposta: "",
    });
    onUpdate(updated);
  };

  const removeItem = (catIdx: number, itemIdx: number) => {
    const updated = JSON.parse(JSON.stringify(custos)) as CustosData;
    updated.categorias[catIdx].items.splice(itemIdx, 1);
    onUpdate(updated);
  };

  const updateArea = (value: number) => {
    const updated = { ...custos, areaMt2: value };
    onUpdate(updated);
  };

  const handleUpload = async (catIdx: number, itemIdx: number, file: File) => {
    const item = custos.categorias[catIdx].items[itemIdx];
    setUploading(item.id);
    try {
      const ext = file.name.split(".").pop();
      const path = `${store.id}/${item.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("propostas").upload(path, file);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("propostas").getPublicUrl(path);
      updateItem(catIdx, itemIdx, "proposta", urlData.publicUrl);
      toast.success("Proposta anexada!");
    } catch (e: any) {
      toast.error("Erro ao anexar: " + e.message);
    } finally {
      setUploading(null);
    }
  };

  const removeProposta = (catIdx: number, itemIdx: number) => {
    updateItem(catIdx, itemIdx, "proposta", "");
    toast.success("Proposta removida");
  };

  // Category totals
  const getCatTotal = (catIdx: number, field: "valorPrevisto" | "valorRealizado") =>
    custos.categorias[catIdx].items.reduce((sum, it) => sum + (it[field] || 0), 0);

  const grandTotalPrevisto = custos.categorias.reduce((s, _, i) => s + getCatTotal(i, "valorPrevisto"), 0);
  const grandTotalRealizado = custos.categorias.reduce((s, _, i) => s + getCatTotal(i, "valorRealizado"), 0);

  // Summary by category mapping
  const summaryLabels: Record<string, string> = {
    execucao: "Mão de Obra",
    moveis: "Móveis",
    piso: "Piso",
    iluminacao: "Iluminação",
    informatica: "Informática",
    demais: "Demais Itens",
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileRef}
        className="hidden"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadTarget) {
            handleUpload(uploadTarget.catIdx, uploadTarget.itemIdx, file);
          }
          e.target.value = "";
        }}
      />

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Área (m²)</p>
            <Input
              type="number"
              className="h-8 text-sm font-semibold"
              value={custos.areaMt2 || ""}
              onChange={(e) => updateArea(parseFloat(e.target.value) || 0)}
              placeholder="0"
            />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Previsto</p>
            <p className="text-lg font-bold text-primary">{formatCurrency(grandTotalPrevisto)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Total Realizado</p>
            <p className="text-lg font-bold text-[hsl(152,60%,40%)]">{formatCurrency(grandTotalRealizado)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Valor/m²</p>
            <p className="text-lg font-bold">
              {custos.areaMt2 > 0 ? formatCurrency(grandTotalRealizado / custos.areaMt2) : "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary by category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Resumo por Categoria
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Previsto</TableHead>
                <TableHead className="text-right">Realizado</TableHead>
                <TableHead className="text-right">Diferença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custos.categorias.map((cat, i) => {
                const prev = getCatTotal(i, "valorPrevisto");
                const real = getCatTotal(i, "valorRealizado");
                const diff = real - prev;
                return (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium text-sm">{summaryLabels[cat.id] || cat.nome}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(prev)}</TableCell>
                    <TableCell className="text-right text-sm font-semibold">{formatCurrency(real)}</TableCell>
                    <TableCell className={`text-right text-sm font-semibold ${diff > 0 ? "text-destructive" : diff < 0 ? "text-[hsl(152,60%,40%)]" : ""}`}>
                      {diff !== 0 ? (diff > 0 ? "+" : "") + formatCurrency(diff) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
              <TableRow className="bg-muted/30 font-bold">
                <TableCell>TOTAL</TableCell>
                <TableCell className="text-right">{formatCurrency(grandTotalPrevisto)}</TableCell>
                <TableCell className="text-right">{formatCurrency(grandTotalRealizado)}</TableCell>
                <TableCell className={`text-right ${grandTotalRealizado - grandTotalPrevisto > 0 ? "text-destructive" : "text-[hsl(152,60%,40%)]"}`}>
                  {grandTotalRealizado - grandTotalPrevisto !== 0
                    ? (grandTotalRealizado - grandTotalPrevisto > 0 ? "+" : "") + formatCurrency(grandTotalRealizado - grandTotalPrevisto)
                    : "—"}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail accordion per category */}
      <Accordion type="multiple" className="space-y-2">
        {custos.categorias.map((cat, catIdx) => (
          <AccordionItem key={cat.id} value={cat.id} className="border rounded-xl bg-card overflow-hidden">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-3 w-full">
                <span className="font-semibold text-sm">{cat.nome}</span>
                <Badge variant="outline" className="ml-auto mr-2 text-xs">
                  {formatCurrency(getCatTotal(catIdx, "valorRealizado"))}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="min-w-[200px]">Item</TableHead>
                      <TableHead className="min-w-[140px]">Observação</TableHead>
                      <TableHead className="w-[140px]">Valor Previsto</TableHead>
                      <TableHead className="w-[140px]">Valor Realizado</TableHead>
                      <TableHead className="w-[120px]">Proposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cat.items.map((item, itemIdx) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{item.nome}</TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            value={item.fornecedor}
                            placeholder="Observação..."
                            onChange={(e) => updateItem(catIdx, itemIdx, "fornecedor", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            type="number"
                            step="0.01"
                            value={item.valorPrevisto || ""}
                            placeholder="0,00"
                            onChange={(e) => updateItem(catIdx, itemIdx, "valorPrevisto", parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="h-8 text-xs"
                            type="number"
                            step="0.01"
                            value={item.valorRealizado || ""}
                            placeholder="0,00"
                            onChange={(e) => updateItem(catIdx, itemIdx, "valorRealizado", parseFloat(e.target.value) || 0)}
                          />
                        </TableCell>
                        <TableCell>
                          {item.proposta ? (
                            <div className="flex items-center gap-1">
                              <a href={item.proposta} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <FileText className="h-3.5 w-3.5 text-primary" />
                                </Button>
                              </a>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => removeProposta(catIdx, itemIdx)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={uploading === item.id}
                              onClick={() => {
                                setUploadTarget({ catIdx, itemIdx });
                                fileRef.current?.click();
                              }}
                            >
                              <Upload className="h-3 w-3" />
                              {uploading === item.id ? "..." : "Anexar"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Category subtotal */}
                    <TableRow className="bg-muted/20 font-semibold">
                      <TableCell colSpan={2} className="text-sm">Subtotal {cat.nome}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(getCatTotal(catIdx, "valorPrevisto"))}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(getCatTotal(catIdx, "valorRealizado"))}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
