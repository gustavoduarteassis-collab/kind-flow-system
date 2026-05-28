import { useState, useRef } from "react";
import {
  VisitaStatusType,
  VisitaTecnicaData,
  VisitaItemData,
  VisitaCategory,
  visitaTecnicaCategories,
  visitaStatusLabels,
  visitaStatusColors,
  createDefaultVisitaTecnica,
} from "@/data/visitaTecnicaData";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Trash2,
  ImageIcon,
  FileText,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  storeId: string;
  storeInauguracao: string;
  data: any;
  onDataChange: (data: VisitaTecnicaData) => void;
}

const ChecklistVisitaTecnica = ({ storeId, storeInauguracao, data: rawData, onDataChange }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<string[] | null>(null);

  const vtData: VisitaTecnicaData = {
    ...createDefaultVisitaTecnica(),
    ...(rawData || {}),
  };

  const update = (partial: Partial<VisitaTecnicaData>) => {
    onDataChange({ ...vtData, ...partial });
  };

  const getItemData = (itemId: string): VisitaItemData => {
    return vtData.items[itemId] || { status: "NAO_INICIADO", observacoes: "", photos: [] };
  };

  const handleStatusChange = (itemId: string, status: VisitaStatusType) => {
    const existing = getItemData(itemId);
    update({ items: { ...vtData.items, [itemId]: { ...existing, status } } });
  };

  const handleObsChange = (itemId: string, value: string) => {
    const existing = getItemData(itemId);
    update({ items: { ...vtData.items, [itemId]: { ...existing, observacoes: value } } });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !uploadingItemId) return;
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const path = `${storeId}/${uploadingItemId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("visita-tecnica-photos").upload(path, file);
    if (error) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("visita-tecnica-photos").getPublicUrl(path);
    const itemData = getItemData(uploadingItemId);
    const newPhotos = [...(itemData.photos || []), urlData.publicUrl];
    update({ items: { ...vtData.items, [uploadingItemId]: { ...itemData, photos: newPhotos } } });
    setUploadingItemId(null);
    toast({ title: "Foto anexada!" });
  };

  const handleDeletePhoto = (itemId: string, photoIndex: number) => {
    const itemData = getItemData(itemId);
    const newPhotos = (itemData.photos || []).filter((_, i) => i !== photoIndex);
    update({ items: { ...vtData.items, [itemId]: { ...itemData, photos: newPhotos } } });
  };

  // Progress
  const allItems = visitaTecnicaCategories.flatMap((c) => c.items);
  const applicableItems = allItems.filter(item => vtData.items[item.id]?.status !== "NAO_SE_APLICA");
  const totalItems = allItems.length;
  const doneItems = allItems.filter((item) => {
    const s = vtData.items[item.id]?.status;
    return s === "CONCLUIDO";
  }).length;
  
  const totalScore = allItems.reduce((acc, item) => {
    const s = vtData.items[item.id]?.status;
    if (s === "CONCLUIDO") return acc + 100;
    if (s === "EM_ANDAMENTO") return acc + 50;
    return acc;
  }, 0);

  const maxScore = applicableItems.length * 100;
  const progress = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const getCatProgress = (cat: VisitaCategory) => {
    const done = cat.items.filter((i) => {
      const s = vtData.items[i.id]?.status;
      return s === "CONCLUIDO" || s === "NAO_SE_APLICA";
    }).length;
    return Math.round((done / cat.items.length) * 100);
  };

  const formatDateBR = (d: string) => d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—";

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {/* Header with dates */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm">📅 Datas Importantes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data da Visita</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataVisita} onChange={(e) => update({ dataVisita: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inauguração Prevista</Label>
              <div className="h-8 flex items-center text-xs px-3 border rounded-md bg-muted/50 text-muted-foreground">
                {formatDateBR(storeInauguracao)}
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inauguração Após Visita</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataInaugAposVisita} onChange={(e) => update({ dataInaugAposVisita: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Chegada dos Móveis</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.chegadaMoveis} onChange={(e) => update({ chegadaMoveis: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Chegada dos Produtos</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.chegadaProdutos} onChange={(e) => update({ chegadaProdutos: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <div className="flex items-center gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso da Visita Técnica</span>
            <span className="font-bold">{progress}%</span>
          </div>
          <Progress value={progress} className="h-3" />
        </div>
        <Badge className="bg-[hsl(152,60%,40%)] text-[hsl(0,0%,100%)]">
          {doneItems}/{totalItems}
        </Badge>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => navigate(`/loja/${storeId}/relatorio?secao=visita-tecnica`)}>
          <FileText className="h-4 w-4" /> Relatório
        </Button>
      </div>

      {/* Categories */}
      <Accordion type="multiple" defaultValue={visitaTecnicaCategories.map((c) => c.id)} className="space-y-2">
        {visitaTecnicaCategories.map((cat) => {
          const catProg = getCatProgress(cat);
          return (
            <AccordionItem key={cat.id} value={cat.id} className="border rounded-lg px-2">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1">
                  <span className="font-semibold text-sm">{cat.nome}</span>
                  <Badge variant="secondary" className="text-xs">{catProg}%</Badge>
                  <span className="text-xs text-muted-foreground">
                    ({cat.items.filter((i) => {
                      const s = vtData.items[i.id]?.status;
                      return s === "CONCLUIDO" || s === "NAO_SE_APLICA";
                    }).length}/{cat.items.length})
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/30">
                        <TableHead className="min-w-[200px]">Item</TableHead>
                        <TableHead className="min-w-[250px]">Orientação</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[80px]">Fotos</TableHead>
                        <TableHead className="min-w-[180px]">Observações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cat.items.map((item) => {
                        const itemData = getItemData(item.id);
                        const photoCount = (itemData.photos || []).length;
                        return (
                          <TableRow
                            key={item.id}
                            className={
                              itemData.status === "CONCLUIDO"
                                ? "bg-[hsl(152,60%,95%)]"
                                : itemData.status === "EM_ANDAMENTO"
                                ? "bg-[hsl(38,90%,97%)]"
                                : itemData.status === "NAO_INICIADO"
                                ? "bg-[hsl(0,84%,97%)]"
                                : "bg-muted/30"
                            }
                          >
                            <TableCell className="text-sm font-medium">{item.nome}</TableCell>
                            <TableCell className="text-xs text-muted-foreground leading-relaxed">
                              {item.orientacao}
                            </TableCell>
                            <TableCell>
                              <Select value={itemData.status} onValueChange={(v) => handleStatusChange(item.id, v as VisitaStatusType)}>
                                <SelectTrigger className="h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {(Object.keys(visitaStatusLabels) as VisitaStatusType[]).map((s) => (
                                    <SelectItem key={s} value={s}>
                                      <Badge className={`${visitaStatusColors[s]} text-[10px]`}>{visitaStatusLabels[s]}</Badge>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => {
                                    setUploadingItemId(item.id);
                                    fileInputRef.current?.click();
                                  }}
                                >
                                  <Camera className="h-3.5 w-3.5" />
                                </Button>
                                {photoCount > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 relative"
                                    onClick={() => setPreviewPhotos(itemData.photos || [])}
                                  >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                    <span className="text-[10px] absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
                                      {photoCount}
                                    </span>
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                className="h-8 text-xs"
                                placeholder="Observações..."
                                value={itemData.observacoes}
                                onChange={(e) => handleObsChange(item.id, e.target.value)}
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

      {/* Signatures */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm">✍️ Assinaturas</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Construtora</Label>
              <Input
                placeholder="Nome do responsável da construtora"
                value={vtData.signatures.construtora}
                onChange={(e) => update({ signatures: { ...vtData.signatures, construtora: e.target.value } })}
              />
              <div className="border-b-2 border-foreground/30 mt-6 pt-4" />
              <p className="text-[10px] text-center text-muted-foreground">Assinatura Construtora</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Analista</Label>
              <Input
                placeholder="Nome da analista"
                value={vtData.signatures.analista}
                onChange={(e) => update({ signatures: { ...vtData.signatures, analista: e.target.value } })}
              />
              <div className="border-b-2 border-foreground/30 mt-6 pt-4" />
              <p className="text-[10px] text-center text-muted-foreground">Assinatura Analista</p>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Franqueado</Label>
              <Input
                placeholder="Nome do franqueado"
                value={vtData.signatures.franqueado}
                onChange={(e) => update({ signatures: { ...vtData.signatures, franqueado: e.target.value } })}
              />
              <div className="border-b-2 border-foreground/30 mt-6 pt-4" />
              <p className="text-[10px] text-center text-muted-foreground">Assinatura Franqueado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhotos} onOpenChange={() => setPreviewPhotos(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fotos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            {previewPhotos?.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-48 object-cover rounded-lg border" />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => {
                    const itemId = Object.keys(vtData.items).find((id) =>
                      vtData.items[id]?.photos?.includes(url)
                    );
                    if (itemId) handleDeletePhoto(itemId, idx);
                    setPreviewPhotos((prev) => prev?.filter((_, i) => i !== idx) || null);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistVisitaTecnica;
