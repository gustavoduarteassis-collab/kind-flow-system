import { useState } from "react";
import { SOLICITACOES_ITEMS, SolicitacoesData, SolicitacaoStatus, createDefaultSolicitacoes } from "@/data/solicitacoesData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquare, CheckCircle2, Clock, AlertCircle } from "lucide-react";

const statusLabels: Record<SolicitacaoStatus, string> = {
  pendente: "Não Realizado",
  solicitado: "Em Andamento",
  concluido: "Realizado",
};

const statusColors: Record<SolicitacaoStatus, string> = {
  pendente: "bg-destructive text-destructive-foreground",
  solicitado: "bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)]",
  concluido: "bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]",
};

const statusIcons: Record<SolicitacaoStatus, typeof AlertCircle> = {
  pendente: AlertCircle,
  solicitado: Clock,
  concluido: CheckCircle2,
};

type Props = {
  data: SolicitacoesData;
  onUpdate: (data: SolicitacoesData) => void;
};

const SolicitacoesLoja = ({ data, onUpdate }: Props) => {
  const [commentOpen, setCommentOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Ensure defaults
  const solicitacoes = { ...createDefaultSolicitacoes(), ...data };

  const handleChange = (itemId: string, field: string, value: string) => {
    const updated = { ...solicitacoes, [itemId]: { ...solicitacoes[itemId], [field]: value } };
    onUpdate(updated);
  };

  const openComments = (itemId: string) => {
    setSelectedItem(itemId);
    setCommentOpen(true);
  };

  const totalItems = SOLICITACOES_ITEMS.length;
  const concluidos = SOLICITACOES_ITEMS.filter((i) => solicitacoes[i.id]?.status === "concluido").length;
  const solicitados = SOLICITACOES_ITEMS.filter((i) => solicitacoes[i.id]?.status === "solicitado").length;
  const pendentes = totalItems - concluidos - solicitados;

  const selectedItemData = selectedItem ? solicitacoes[selectedItem] : null;
  const selectedItemLabel = selectedItem ? SOLICITACOES_ITEMS.find((i) => i.id === selectedItem)?.label : "";

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)] text-xs">✓ {concluidos} Concluídos</Badge>
        <Badge className="bg-[hsl(38,90%,55%)] text-[hsl(38,90%,15%)] text-xs">⏳ {solicitados} Solicitados</Badge>
        <Badge className="bg-secondary text-secondary-foreground text-xs">○ {pendentes} Pendentes</Badge>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📋 Solicitações da Loja</CardTitle>
          <p className="text-xs text-muted-foreground">Itens que a analista precisa solicitar e o franqueado precisa ficar ciente</p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="min-w-[200px]">Item</TableHead>
                  <TableHead className="w-[150px]">Status</TableHead>
                  <TableHead className="w-[140px]">Data Solicitação</TableHead>
                  <TableHead className="w-[140px]">Data Conclusão</TableHead>
                  <TableHead className="w-[60px] text-center">💬</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {SOLICITACOES_ITEMS.map((item) => {
                  const itemData = solicitacoes[item.id];
                  const StatusIcon = statusIcons[itemData.status];
                  const hasComments = !!(itemData.comentarios && itemData.comentarios.trim());
                  return (
                    <TableRow
                      key={item.id}
                      className={
                        itemData.status === "concluido" ? "bg-[hsl(152,60%,95%)]" :
                        itemData.status === "solicitado" ? "bg-[hsl(38,90%,97%)]" : ""
                      }
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${
                            itemData.status === "concluido" ? "text-[hsl(152,60%,40%)]" :
                            itemData.status === "solicitado" ? "text-[hsl(38,90%,55%)]" :
                            "text-muted-foreground"
                          }`} />
                          <span className="text-sm font-medium">{item.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={itemData.status}
                          onValueChange={(v) => handleChange(item.id, "status", v)}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>
                                <Badge className={`${statusColors[k as SolicitacaoStatus]} text-[10px]`}>{v}</Badge>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={itemData.dataSolicitacao}
                          onChange={(e) => handleChange(item.id, "dataSolicitacao", e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="date"
                          className="h-8 text-xs"
                          value={itemData.dataConclusao}
                          onChange={(e) => handleChange(item.id, "dataConclusao", e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openComments(item.id)}
                        >
                          <MessageSquare className={`h-4 w-4 ${hasComments ? "text-primary" : "text-muted-foreground"}`} />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Comments Dialog */}
      <Dialog open={commentOpen} onOpenChange={setCommentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentários — {selectedItemLabel}</DialogTitle>
          </DialogHeader>
          {selectedItem && selectedItemData && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2">
                <Badge className={`${statusColors[selectedItemData.status]} text-xs`}>
                  {statusLabels[selectedItemData.status]}
                </Badge>
                {selectedItemData.dataSolicitacao && (
                  <span className="text-xs text-muted-foreground">
                    Solicitado: {new Date(selectedItemData.dataSolicitacao + "T00:00:00").toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
              <Textarea
                rows={5}
                placeholder="Adicione comentários, observações ou atualizações..."
                value={selectedItemData.comentarios}
                onChange={(e) => handleChange(selectedItem, "comentarios", e.target.value)}
              />
              <Button onClick={() => setCommentOpen(false)} className="w-full">Fechar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SolicitacoesLoja;
