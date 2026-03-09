import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus, Camera, Trash2, ChevronLeft, ChevronRight, CloudSun, Users,
  CalendarDays, ImageIcon, Upload, FileImage, Clock,
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

type DiaryEntry = {
  id: string; store_id: string; entry_date: string; description: string;
  weather: string; workers_count: number; created_at: string;
};
type DiaryPhoto = {
  id: string; diary_id: string; photo_url: string; caption: string;
};

interface DiarioObraProps { storeId: string; }

const DiarioObra = ({ storeId }: DiarioObraProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [photos, setPhotos] = useState<Record<string, DiaryPhoto[]>>({});
  const [month, setMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    entry_date: format(new Date(), "yyyy-MM-dd"),
    description: "", weather: "", workers_count: 0,
  });
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [tab, setTab] = useState("registros");

  const fetchEntries = useCallback(async () => {
    if (!user) return;
    const mStart = format(startOfMonth(month), "yyyy-MM-dd");
    const mEnd = format(endOfMonth(month), "yyyy-MM-dd");
    const { data: entriesData } = await supabase
      .from("construction_diary").select("*").eq("store_id", storeId)
      .gte("entry_date", mStart).lte("entry_date", mEnd)
      .order("entry_date", { ascending: false });
    if (entriesData) {
      setEntries(entriesData as DiaryEntry[]);
      const ids = entriesData.map((e: any) => e.id);
      if (ids.length > 0) {
        const { data: photosData } = await supabase.from("diary_photos").select("*").in("diary_id", ids);
        if (photosData) {
          const grouped: Record<string, DiaryPhoto[]> = {};
          (photosData as DiaryPhoto[]).forEach((p) => {
            if (!grouped[p.diary_id]) grouped[p.diary_id] = [];
            grouped[p.diary_id].push(p);
          });
          setPhotos(grouped);
        }
      } else { setPhotos({}); }
    }
  }, [user, storeId, month]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const uploadPhoto = async (entryId: string, file: File) => {
    if (!user) return;
    const ext = file.name.split(".").pop();
    const path = `${user.id}/${entryId}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("diary-photos").upload(path, file);
    if (uploadError) {
      toast({ title: "Erro no upload", description: uploadError.message, variant: "destructive" });
      return;
    }
    const { data: urlData } = supabase.storage.from("diary-photos").getPublicUrl(path);
    await supabase.from("diary_photos").insert({ diary_id: entryId, photo_url: urlData.publicUrl, caption: "" });
  };

  const addEntry = async () => {
    if (!user || !form.description) {
      toast({ title: "Preencha a descrição", variant: "destructive" }); return;
    }
    setUploading(true);
    const { data, error } = await supabase.from("construction_diary").insert({
      store_id: storeId, user_id: user.id, entry_date: form.entry_date,
      description: form.description, weather: form.weather, workers_count: form.workers_count,
    }).select().single();
    if (error || !data) {
      toast({ title: "Erro", description: error?.message, variant: "destructive" });
      setUploading(false); return;
    }
    // Upload pending photos
    for (const file of pendingPhotos) {
      await uploadPhoto(data.id, file);
    }
    setForm({ entry_date: format(new Date(), "yyyy-MM-dd"), description: "", weather: "", workers_count: 0 });
    setPendingPhotos([]);
    setDialogOpen(false);
    setUploading(false);
    fetchEntries();
    toast({ title: "Registro adicionado!" });
  };

  const deleteEntry = async (id: string) => {
    await supabase.from("construction_diary").delete().eq("id", id);
    fetchEntries();
  };

  const addPhotoToEntry = async (entryId: string, files: FileList) => {
    setUploading(true);
    for (const file of Array.from(files)) {
      await uploadPhoto(entryId, file);
    }
    setUploading(false);
    fetchEntries();
    toast({ title: "Foto(s) adicionada(s)!" });
  };

  const deletePhoto = async (photoId: string) => {
    await supabase.from("diary_photos").delete().eq("id", photoId);
    fetchEntries();
  };

  const formatDateBR = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("pt-BR", {
      weekday: "long", day: "2-digit", month: "long", year: "numeric",
    });

  const formatDateShort = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

  const totalPhotos = Object.values(photos).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Diário de Obra</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Registro</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Novo Registro do Diário</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Descrição das Atividades *</Label>
                <Textarea rows={4} placeholder="Descreva as atividades realizadas no dia..."
                  value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clima</Label>
                  <Input placeholder="Ex: Ensolarado" value={form.weather}
                    onChange={(e) => setForm({ ...form, weather: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Nº de Funcionários</Label>
                  <Input type="number" min={0} value={form.workers_count}
                    onChange={(e) => setForm({ ...form, workers_count: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              {/* Photo upload area */}
              <div className="space-y-2">
                <Label>Fotos / Comprovantes</Label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 cursor-pointer hover:border-primary/50 transition-colors bg-muted/30">
                  <input type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => {
                      if (e.target.files) setPendingPhotos((prev) => [...prev, ...Array.from(e.target.files!)]);
                    }}
                  />
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">Clique ou arraste fotos aqui</span>
                  <span className="text-xs text-muted-foreground mt-1">JPG, PNG — múltiplos arquivos</span>
                </label>
                {pendingPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pendingPhotos.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="h-16 w-16 object-cover rounded-md" />
                        <button
                          className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5"
                          onClick={() => setPendingPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={addEntry} className="w-full" disabled={uploading}>
                {uploading ? "Salvando..." : "Salvar Registro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="outline" size="icon" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm font-semibold capitalize">
          {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
        </span>
        <Button variant="outline" size="icon" onClick={() => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Dashboard summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <CalendarDays className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{entries.length}</p>
            <p className="text-xs text-muted-foreground">Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileImage className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{totalPhotos}</p>
            <p className="text-xs text-muted-foreground">Fotos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">
              {entries.length > 0 ? Math.round(entries.reduce((s, e) => s + e.workers_count, 0) / entries.length) : 0}
            </p>
            <p className="text-xs text-muted-foreground">Média Func.</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Registros / Linha do Tempo */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full">
          <TabsTrigger value="registros" className="flex-1">📋 Registros</TabsTrigger>
          <TabsTrigger value="timeline" className="flex-1">🕐 Linha do Tempo</TabsTrigger>
        </TabsList>

        {/* === REGISTROS === */}
        <TabsContent value="registros" className="mt-4">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum registro neste mês</p>
                <p className="text-sm mt-1">Clique em "Novo Registro" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => {
                const entryPhotos = photos[entry.id] || [];
                return (
                  <Card key={entry.id} className="overflow-hidden">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-sm font-semibold capitalize">
                            {formatDateBR(entry.entry_date)}
                          </CardTitle>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            {entry.weather && (
                              <span className="flex items-center gap-1">
                                <CloudSun className="h-3.5 w-3.5" /> {entry.weather}
                              </span>
                            )}
                            {entry.workers_count > 0 && (
                              <span className="flex items-center gap-1">
                                <Users className="h-3.5 w-3.5" /> {entry.workers_count} funcionários
                              </span>
                            )}
                            <Badge variant="outline" className="text-[10px]">
                              <ImageIcon className="h-3 w-3 mr-1" /> {entryPhotos.length} foto(s)
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <label className="cursor-pointer">
                            <input type="file" accept="image/*" multiple className="hidden"
                              onChange={(e) => { if (e.target.files) addPhotoToEntry(entry.id, e.target.files); }} />
                            <Button variant="outline" size="sm" className="gap-1 pointer-events-none" tabIndex={-1} disabled={uploading}>
                              <Camera className="h-3.5 w-3.5" /> Foto
                            </Button>
                          </label>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={() => { if (confirm("Excluir este registro?")) deleteEntry(entry.id); }}>
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-3">
                      <p className="text-sm whitespace-pre-wrap">{entry.description}</p>
                      {entryPhotos.length > 0 && (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                          {entryPhotos.map((photo) => (
                            <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden bg-muted">
                              <img src={photo.photo_url} alt={photo.caption || "Foto da obra"}
                                className="w-full h-full object-cover cursor-pointer"
                                onClick={() => { setSelectedEntry(entry); setPhotoDialogOpen(true); }} />
                              <button
                                className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => { if (confirm("Excluir foto?")) deletePhoto(photo.id); }}>
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === LINHA DO TEMPO === */}
        <TabsContent value="timeline" className="mt-4">
          {entries.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>Nenhum registro para exibir na linha do tempo</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Linha do Tempo</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="overflow-x-auto pb-4">
                  <div className="relative min-w-[600px]" style={{ minWidth: `${Math.max(600, sortedEntries.length * 140)}px` }}>
                    {/* Top labels (even indices) */}
                    <div className="flex items-end" style={{ height: "100px", marginBottom: "8px" }}>
                      {sortedEntries.map((entry, idx) => {
                        if (idx % 2 !== 0) return <div key={entry.id} className="flex-1" />;
                        const entryPhotos = photos[entry.id] || [];
                        return (
                          <div key={entry.id} className="flex-1 flex flex-col items-center px-1">
                            <div
                              className="text-center cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors max-w-[130px]"
                              onClick={() => { setSelectedEntry(entry); setPhotoDialogOpen(true); }}
                            >
                              <p className="text-[11px] font-medium leading-tight line-clamp-3">{entry.description}</p>
                              {entryPhotos.length > 0 && (
                                <span className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                  <ImageIcon className="h-2.5 w-2.5" /> {entryPhotos.length}
                                </span>
                              )}
                            </div>
                            {/* Connector line down to dot */}
                            <div className="w-px h-3 bg-primary/40" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Horizontal line with dots and dates */}
                    <div className="relative">
                      {/* Main horizontal line */}
                      <div className="absolute top-[6px] left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-primary to-primary/40 rounded-full" />
                      <div className="flex">
                        {sortedEntries.map((entry) => (
                          <div key={entry.id} className="flex-1 flex flex-col items-center">
                            {/* Dot */}
                            <div className="w-[14px] h-[14px] rounded-full bg-background border-[3px] border-primary relative z-10" />
                            {/* Date label */}
                            <span className="text-[10px] font-semibold text-muted-foreground mt-1.5 whitespace-nowrap">
                              {new Date(entry.entry_date + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom labels (odd indices) */}
                    <div className="flex items-start" style={{ marginTop: "8px", height: "100px" }}>
                      {sortedEntries.map((entry, idx) => {
                        if (idx % 2 !== 1) return <div key={entry.id} className="flex-1" />;
                        const entryPhotos = photos[entry.id] || [];
                        return (
                          <div key={entry.id} className="flex-1 flex flex-col items-center px-1">
                            {/* Connector line up from dot */}
                            <div className="w-px h-3 bg-primary/40" />
                            <div
                              className="text-center cursor-pointer hover:bg-muted/50 rounded-lg p-1.5 transition-colors max-w-[130px]"
                              onClick={() => { setSelectedEntry(entry); setPhotoDialogOpen(true); }}
                            >
                              <p className="text-[11px] font-medium leading-tight line-clamp-3">{entry.description}</p>
                              {entryPhotos.length > 0 && (
                                <span className="text-[9px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                                  <ImageIcon className="h-2.5 w-2.5" /> {entryPhotos.length}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Photo gallery dialog */}
      <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedEntry && formatDateBR(selectedEntry.entry_date)}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
            {selectedEntry && (photos[selectedEntry.id] || []).map((photo) => (
              <img key={photo.id} src={photo.photo_url} alt={photo.caption || "Foto da obra"}
                className="w-full rounded-lg object-cover" />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DiarioObra;
