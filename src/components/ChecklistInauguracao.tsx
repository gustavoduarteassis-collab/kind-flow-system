import { useState } from "react";
import {
  InaugStatusType,
  InaugChecklistData,
  InaugCategory,
  getInaugChecklist,
  inaugStatusLabels,
  inaugStatusColors,
  createDefaultInaugChecklist,
} from "@/data/inauguracaoChecklistData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  tipoLoja: "rua" | "shopping" | "";
  data: InaugChecklistData;
  onTipoChange: (tipo: "rua" | "shopping") => void;
  onDataChange: (data: InaugChecklistData) => void;
}

const ChecklistInauguracao = ({ tipoLoja, data, onTipoChange, onDataChange }: Props) => {
  const handleTipoSelect = (tipo: "rua" | "shopping") => {
    onTipoChange(tipo);
    if (!data || Object.keys(data).length === 0) {
      onDataChange(createDefaultInaugChecklist(tipo));
    }
  };

  if (!tipoLoja) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <h3 className="text-lg font-semibold mb-4">Selecione o tipo de loja</h3>
        <p className="text-sm text-muted-foreground mb-6">
          O checklist de inauguração varia conforme o tipo de loja.
        </p>
        <div className="flex gap-4">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-all w-48"
            onClick={() => handleTipoSelect("rua")}
          >
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">🏠</div>
              <p className="font-semibold">Loja de Rua</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-primary/50 transition-all w-48"
            onClick={() => handleTipoSelect("shopping")}
          >
            <CardContent className="pt-6 text-center">
              <div className="text-3xl mb-2">🏬</div>
              <p className="font-semibold">Loja de Shopping</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const checklist = getInaugChecklist(tipoLoja);
  const allItems = checklist.categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const doneItems = allItems.filter(
    (item) => data[item.id]?.status === "TOTALMENTE_ATENDIDO" || data[item.id]?.status === "NAO_SE_APLICA"
  ).length;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const impeditivos = allItems.filter((i) => i.impeditivo);
  const impeditivosPendentes = impeditivos.filter(
    (i) => data[i.id]?.status !== "TOTALMENTE_ATENDIDO" && data[i.id]?.status !== "NAO_SE_APLICA"
  ).length;

  const handleStatusChange = (itemId: string, status: InaugStatusType) => {
    onDataChange({ ...data, [itemId]: { ...data[itemId], status } });
  };

  const handleFieldChange = (itemId: string, field: "observacoes" | "data" | "prazo", value: string) => {
    onDataChange({ ...data, [itemId]: { ...data[itemId], [field]: value } });
  };

  const getCatProgress = (cat: InaugCategory) => {
    const done = cat.items.filter(
      (i) => data[i.id]?.status === "TOTALMENTE_ATENDIDO" || data[i.id]?.status === "NAO_SE_APLICA"
    ).length;
    return Math.round((done / cat.items.length) * 100);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-sm">
            {tipoLoja === "rua" ? "🏠 Loja de Rua" : "🏬 Loja de Shopping"}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {doneItems}/{totalItems} itens concluídos
          </span>
        </div>
        <div className="flex items-center gap-3">
          {impeditivosPendentes > 0 && (
            <Badge variant="destructive" className="text-xs">
              ⚠ {impeditivosPendentes} impeditivos pendentes
            </Badge>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Progresso Geral</span>
          <span className="font-bold">{progress}%</span>
        </div>
        <Progress value={progress} className="h-3" />
      </div>

      {/* Categories */}
      <Accordion type="multiple" className="space-y-2">
        {checklist.categories.map((cat) => {
          const catProg = getCatProgress(cat);
          return (
            <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg px-2">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-sm">{cat.nome}</span>
                  <Badge variant="secondary" className="text-xs">{catProg}%</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({cat.items.filter((i) => data[i.id]?.status === "TOTALMENTE_ATENDIDO" || data[i.id]?.status === "NAO_SE_APLICA").length}/{cat.items.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="min-w-[280px]">Item</TableHead>
                        <TableHead className="w-[160px]">Status</TableHead>
                        <TableHead className="w-[120px]">Data</TableHead>
                        <TableHead className="w-[120px]">Prazo</TableHead>
                        <TableHead className="min-w-[150px]">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.items.map((item) => {
                        const itemData = data[item.id] || { status: "NAO_ATENDIDO", observacoes: "", data: "", prazo: "" };
                        return (
                          <TableRow
                            key={item.id}
                            className={
                              itemData.status === "TOTALMENTE_ATENDIDO"
                                ? "bg-[hsl(152,60%,95%)]"
                                : item.impeditivo && itemData.status !== "NAO_SE_APLICA"
                                ? "bg-[hsl(0,80%,97%)]"
                                : ""
                            }
                          >
                            <TableCell>
                              <div className="text-sm">
                                {item.nome}
                                {item.impeditivo && (
                                  <Badge variant="outline" className="ml-2 text-[10px] border-destructive text-destructive">
                                    IMPEDITIVO
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                value={itemData.status}
                                onValueChange={(v) => handleStatusChange(item.id, v as InaugStatusType)}
                              >
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(inaugStatusLabels) as InaugStatusType[]).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      <Badge className={`${inaugStatusColors[s]} text-[10px]`}>
                                        {inaugStatusLabels[s]}
                                      </Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={itemData.data}
                                onChange={(e) => handleFieldChange(item.id, "data", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="date"
                                className="h-8 text-xs"
                                value={itemData.prazo}
                                onChange={(e) => handleFieldChange(item.id, "prazo", e.target.value)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Obs..."
                                value={itemData.observacoes}
                                onChange={(e) => handleFieldChange(item.id, "observacoes", e.target.value)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default ChecklistInauguracao;
