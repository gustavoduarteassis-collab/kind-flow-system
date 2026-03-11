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
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  Camera,
  Eye,
  Trash2,
  ImageIcon,
  FileText,
  CalendarIcon,
  Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Props {
  storeId: string;
  data: any;
  onDataChange: (data: VisitaTecnicaData) => void;
}

const ChecklistVisitaTecnica = ({ storeId, data: rawData, onDataChange }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<string[] | null>(null);
  const [orientacaoItem, setOrientacaoItem] = useState<{ nome: string; orientacao: string } | null>(null);

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
  const totalItems = allItems.length;
  const doneItems = allItems.filter((item) => {
    const s = vtData.items[item.id]?.status;
    return s === "CONCLUIDO" || s === "NAO_SE_APLICA";
  }).length;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;

  const getCatProgress = (cat: VisitaCategory) => {
    const done = cat.items.filter((i) => {
      const s = vtData.items[i.id]?.status;
      return s === "CONCLUIDO" || s === "NAO_SE_APLICA";
    }).length;
    return Math.round((done / cat.items.length) * 100);
  };

  return (
    <div className="space-y-4">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />

      {/* Header with dates */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <h3 className="font-semibold text-sm">📅 Datas Importantes</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Data da Visita</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataVisita} onChange={(e) => update({ dataVisita: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Inauguração Prevista</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataInaugPrevista} onChange={(e) => update({ dataInaugPrevista: e.target.value })} />
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
            <div className="space-y-1">
              <Label className="text-xs">Data Skytef</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataSkytef} onChange={(e) => update({ dataSkytef: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Data Datasystem</Label>
              <Input type="date" className="h-8 text-xs" value={vtData.dataDatasystem} onChange={(e) => update({ dataDatasystem: e.target.value })} />
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
                        <TableHead className="min-w-[250px]">Item</TableHead>
                        <TableHead className="w-[150px]">Status</TableHead>
                        <TableHead className="w-[80px]">Fotos</TableHead>
                        <TableHead className="min-w-[180px]">Observações</TableHead>
                        <TableHead className="w-[50px]">Info</TableHead>
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
                                : ""
                            }
                          >
                            <TableCell className="text-sm">{item.nome}</TableCell>
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
                                    className="h-7 w-7"
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
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setOrientacaoItem({ nome: item.nome, orientacao: item.orientacao })}
                              >
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
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
                    // Find item that has this photo
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

      {/* Orientação Dialog */}
      <Dialog open={!!orientacaoItem} onOpenChange={() => setOrientacaoItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{orientacaoItem?.nome}</DialogTitle>
          </DialogHeader>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {orientacaoItem?.orientacao}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistVisitaTecnica;
