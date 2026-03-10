import { useState, useRef, useEffect, useCallback } from "react";
import {
  InaugStatusType,
  InaugChecklistDataV2,
  InaugCategory,
  InaugRound,
  InaugItemData,
  InaugSignatures,
  getInaugChecklist,
  inaugStatusLabels,
  inaugStatusColors,
  migrateInaugData,
  createNewRound,
} from "@/data/inauguracaoChecklistData";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus,
  CalendarIcon,
  Camera,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  tipoLoja: "rua" | "shopping" | "";
  data: any;
  onTipoChange: (tipo: "rua" | "shopping") => void;
  onDataChange: (data: InaugChecklistDataV2) => void;
}

const ChecklistInauguracao = ({ tipoLoja, data, onTipoChange, onDataChange }: Props) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingItemId, setUploadingItemId] = useState<string | null>(null);
  const [previewPhotos, setPreviewPhotos] = useState<string[] | null>(null);
  const [activeRoundIndex, setActiveRoundIndex] = useState(0);

  // Use LOCAL state for rounds to avoid stale closure issues
  const [localRounds, setLocalRounds] = useState<InaugChecklistDataV2["rounds"]>(() => {
    return migrateInaugData(data, tipoLoja || "rua").rounds;
  });
  const roundsRef = useRef(localRounds);
  roundsRef.current = localRounds;

  // Sync from parent when data prop changes externally
  useEffect(() => {
    const migrated = migrateInaugData(data, tipoLoja || "rua");
    setLocalRounds(migrated.rounds);
  }, [data, tipoLoja]);

  // Helper to update rounds both locally and in parent
  const updateRounds = useCallback((newRounds: InaugChecklistDataV2["rounds"]) => {
    setLocalRounds(newRounds);
    onDataChange({ rounds: newRounds });
  }, [onDataChange]);

  const handleTipoSelect = (tipo: "rua" | "shopping") => {
    onTipoChange(tipo);
    updateRounds([]);
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
  const rounds = localRounds;
  const currentRound = rounds[activeRoundIndex] || null;

  const handleAddRound = () => {
    // Always use ref for latest data
    const latestRounds = roundsRef.current;
    const lastRound = latestRounds.length > 0 ? latestRounds[latestRounds.length - 1] : undefined;
    const newRound = createNewRound(tipoLoja, latestRounds.length + 1, lastRound);
    const updated = [...latestRounds, newRound];
    updateRounds(updated);
    setActiveRoundIndex(updated.length - 1);
  };

  const handleDeleteRound = (index: number) => {
    if (!confirm("Excluir esta conferência?")) return;
    const newRounds = rounds.filter((_, i) => i !== index);
    updateRounds(newRounds);
    setActiveRoundIndex(Math.max(0, newRounds.length - 1));
  };

  const handleRoundDateChange = (date: Date | undefined) => {
    if (!date || !currentRound) return;
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      date: date.toISOString().split("T")[0],
    };
    onDataChange({ rounds: newRounds });
  };

  const handleDeadlineChange = (date: Date | undefined) => {
    if (!currentRound) return;
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      deadline: date ? date.toISOString().split("T")[0] : "",
    };
    onDataChange({ rounds: newRounds });
  };

  const getItemData = (itemId: string): InaugItemData => {
    return currentRound?.items[itemId] || { status: "NAO_ATENDIDO", observacoes: "", photos: [] };
  };

  const handleStatusChange = (itemId: string, status: InaugStatusType) => {
    if (!currentRound) return;
    const existing = getItemData(itemId);
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      items: {
        ...currentRound.items,
        [itemId]: { ...existing, status },
      },
    };
    onDataChange({ rounds: newRounds });
  };

  const handleObsChange = (itemId: string, value: string) => {
    if (!currentRound) return;
    const existing = getItemData(itemId);
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      items: {
        ...currentRound.items,
        [itemId]: { ...existing, observacoes: value },
      },
    };
    onDataChange({ rounds: newRounds });
  };

  const handleItemDeadlineChange = (itemId: string, date: Date | undefined) => {
    if (!currentRound) return;
    const newRounds = [...rounds];
    const itemData = currentRound.items[itemId] || { status: "NAO_ATENDIDO", observacoes: "", photos: [] };
    newRounds[activeRoundIndex] = {
      ...currentRound,
      items: {
        ...currentRound.items,
        [itemId]: { ...itemData, prazo: date ? date.toISOString().split("T")[0] : undefined },
      },
    };
    onDataChange({ rounds: newRounds });
  };

  const handleSignatureChange = (field: keyof InaugSignatures, value: string) => {
    if (!currentRound) return;
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      signatures: {
        ...currentRound.signatures,
        [field]: value,
      },
    };
    onDataChange({ rounds: newRounds });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !uploadingItemId || !currentRound) return;
    const file = e.target.files[0];
    if (!file) return;

    const ext = file.name.split(".").pop();
    const path = `${currentRound.id}/${uploadingItemId}/${Date.now()}.${ext}`;

    const { data: uploaded, error } = await supabase.storage
      .from("inaug-checklist-photos")
      .upload(path, file);

    if (error) {
      toast({ title: "Erro ao enviar foto", description: error.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage
      .from("inaug-checklist-photos")
      .getPublicUrl(path);

    const photoUrl = urlData.publicUrl;
    const itemData = currentRound.items[uploadingItemId] || { status: "NAO_ATENDIDO", observacoes: "", photos: [] };
    const newPhotos = [...(itemData.photos || []), photoUrl];

    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      items: {
        ...currentRound.items,
        [uploadingItemId]: { ...itemData, photos: newPhotos },
      },
    };
    onDataChange({ rounds: newRounds });
    setUploadingItemId(null);
    toast({ title: "Foto anexada!" });
  };

  const handleDeletePhoto = (itemId: string, photoIndex: number) => {
    if (!currentRound) return;
    const itemData = currentRound.items[itemId];
    if (!itemData) return;
    const newPhotos = itemData.photos.filter((_, i) => i !== photoIndex);
    const newRounds = [...rounds];
    newRounds[activeRoundIndex] = {
      ...currentRound,
      items: {
        ...currentRound.items,
        [itemId]: { ...itemData, photos: newPhotos },
      },
    };
    onDataChange({ rounds: newRounds });
  };

  const allItems = checklist.categories.flatMap((c) => c.items);
  const totalItems = allItems.length;
  const doneItems = currentRound
    ? allItems.filter((item) => {
        const s = currentRound.items[item.id]?.status;
        return s === "TOTALMENTE_ATENDIDO" || s === "NAO_SE_APLICA";
      }).length
    : 0;
  const progress = totalItems > 0 ? Math.round((doneItems / totalItems) * 100) : 0;
  const impeditivos = allItems.filter((i) => i.impeditivo);
  const impeditivosPendentes = currentRound
    ? impeditivos.filter((i) => {
        const s = currentRound.items[i.id]?.status;
        return s !== "TOTALMENTE_ATENDIDO" && s !== "NAO_SE_APLICA";
      }).length
    : 0;

  const getCatProgress = (cat: InaugCategory) => {
    if (!currentRound) return 0;
    const done = cat.items.filter((i) => {
      const s = currentRound.items[i.id]?.status;
      return s === "TOTALMENTE_ATENDIDO" || s === "NAO_SE_APLICA";
    }).length;
    return Math.round((done / cat.items.length) * 100);
  };

  const roundDate = currentRound?.date ? new Date(currentRound.date + "T00:00:00") : undefined;
  const deadlineDate = currentRound?.deadline ? new Date(currentRound.deadline + "T00:00:00") : undefined;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Round Navigation */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {tipoLoja === "rua" ? "🏠 Loja de Rua" : "🏬 Loja de Shopping"}
          </Badge>
          <Badge variant="secondary" className="text-sm">
            {rounds.length} conferência(s)
          </Badge>
        </div>
        <Button size="sm" className="gap-2" onClick={handleAddRound}>
          <Plus className="h-4 w-4" />
          Nova Conferência
        </Button>
      </div>

      {rounds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p className="text-lg mb-2">Nenhuma conferência criada</p>
            <p className="text-sm mb-4">Clique em "Nova Conferência" para iniciar o primeiro checklist de inauguração.</p>
            <Button onClick={handleAddRound} className="gap-2">
              <Plus className="h-4 w-4" /> Criar 1ª Conferência
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Round Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={activeRoundIndex === 0}
              onClick={() => setActiveRoundIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {rounds.map((round, idx) => (
              <Button
                key={round.id}
                variant={idx === activeRoundIndex ? "default" : "outline"}
                size="sm"
                className="shrink-0 text-xs"
                onClick={() => setActiveRoundIndex(idx)}
              >
                {round.label}
              </Button>
            ))}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0"
              disabled={activeRoundIndex === rounds.length - 1}
              onClick={() => setActiveRoundIndex((i) => i + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {currentRound && (
            <>
              {/* Round Info */}
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-sm font-semibold">{currentRound.label}</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("gap-2 text-xs", !roundDate && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {roundDate ? format(roundDate, "dd/MM/yyyy", { locale: ptBR }) : "Data da conferência"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={roundDate}
                        onSelect={handleRoundDateChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("gap-2 text-xs", !deadlineDate && "text-muted-foreground")}>
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {deadlineDate ? `Prazo: ${format(deadlineDate, "dd/MM/yyyy", { locale: ptBR })}` : "Prazo de conclusão"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={deadlineDate}
                        onSelect={handleDeadlineChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-sm text-muted-foreground">
                    {doneItems}/{totalItems} itens
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {impeditivosPendentes > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      ⚠ {impeditivosPendentes} impeditivos pendentes
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive text-xs gap-1"
                    onClick={() => handleDeleteRound(activeRoundIndex)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </Button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progresso</span>
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
                            ({cat.items.filter((i) => {
                              const s = currentRound.items[i.id]?.status;
                              return s === "TOTALMENTE_ATENDIDO" || s === "NAO_SE_APLICA";
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
                                <TableHead className="w-[160px]">Status</TableHead>
                                <TableHead className="w-[80px]">Fotos</TableHead>
                                <TableHead className="w-[130px]">Prazo</TableHead>
                                <TableHead className="min-w-[150px]">Observações</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {cat.items.map((item) => {
                                const itemData: InaugItemData = currentRound.items[item.id] || {
                                  status: "NAO_ATENDIDO",
                                  observacoes: "",
                                  photos: [],
                                };
                                const photoCount = (itemData.photos || []).length;
                                const itemDeadline = itemData.prazo ? new Date(itemData.prazo + "T00:00:00") : undefined;
                                const isPending = itemData.status !== "TOTALMENTE_ATENDIDO" && itemData.status !== "NAO_SE_APLICA";
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
                                      <div className="flex items-center gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7"
                                          title="Anexar foto"
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
                                            size="sm"
                                            className="h-7 px-1.5 text-xs gap-1"
                                            onClick={() => setPreviewPhotos(itemData.photos || [])}
                                          >
                                            <ImageIcon className="h-3 w-3" />
                                            {photoCount}
                                          </Button>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      {isPending ? (
                                        <Popover>
                                          <PopoverTrigger asChild>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className={cn("h-7 text-[10px] gap-1 w-full", !itemDeadline && "text-muted-foreground")}
                                            >
                                              <CalendarIcon className="h-3 w-3" />
                                              {itemDeadline ? format(itemDeadline, "dd/MM/yy", { locale: ptBR }) : "Prazo"}
                                            </Button>
                                          </PopoverTrigger>
                                          <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                              mode="single"
                                              selected={itemDeadline}
                                              onSelect={(d) => handleItemDeadlineChange(item.id, d)}
                                              initialFocus
                                              className="p-3 pointer-events-auto"
                                            />
                                          </PopoverContent>
                                        </Popover>
                                      ) : (
                                        <span className="text-xs text-muted-foreground">—</span>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      <Input
                                        className="h-8 text-xs"
                                        placeholder="Obs..."
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

              {/* Signatures Section */}
              <Card className="mt-6">
                <CardContent className="pt-6">
                  <h4 className="text-sm font-semibold mb-4">Assinaturas</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Franqueado</label>
                      <Input
                        placeholder="Nome do franqueado"
                        value={currentRound.signatures?.franqueado || ""}
                        onChange={(e) => handleSignatureChange("franqueado", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="border-b border-foreground/30 mt-6 pt-8" />
                      <p className="text-[10px] text-center text-muted-foreground">Assinatura do Franqueado</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Analista de Obra</label>
                      <Input
                        placeholder="Nome do analista"
                        value={currentRound.signatures?.analistaObra || ""}
                        onChange={(e) => handleSignatureChange("analistaObra", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="border-b border-foreground/30 mt-6 pt-8" />
                      <p className="text-[10px] text-center text-muted-foreground">Assinatura do Analista de Obra</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Construtor</label>
                      <Input
                        placeholder="Nome do construtor"
                        value={currentRound.signatures?.construtor || ""}
                        onChange={(e) => handleSignatureChange("construtor", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <div className="border-b border-foreground/30 mt-6 pt-8" />
                      <p className="text-[10px] text-center text-muted-foreground">Assinatura do Construtor</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}

      {/* Photo Preview Dialog */}
      <Dialog open={!!previewPhotos} onOpenChange={() => setPreviewPhotos(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fotos Anexadas</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {previewPhotos?.map((url, idx) => (
              <div key={idx} className="relative group">
                <img src={url} alt={`Foto ${idx + 1}`} className="rounded-lg w-full h-48 object-cover" />
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="absolute top-2 right-2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-4 w-4" />
                </a>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChecklistInauguracao;
