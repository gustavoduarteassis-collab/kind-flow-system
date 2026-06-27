import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserDisplayName } from "@/hooks/useUserDisplayName";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Pin, PinOff, Trash2, MessageSquare, Send } from "lucide-react";
import { toast } from "sonner";
import { formatBR } from "@/utils/safeDate";

interface Message {
  id: string;
  user_id: string | null;
  author_name: string;
  author_role: string;
  channel: string;
  message: string;
  attachment_url: string | null;
  pinned: boolean;
  created_at: string;
}

const channelLabels: Record<string, string> = {
  interno: "💬 Interno",
  whatsapp: "📱 WhatsApp",
  email: "✉️ E-mail",
  reuniao: "🤝 Reunião",
  telefone: "📞 Telefone",
};

const channelColors: Record<string, string> = {
  interno: "bg-muted text-muted-foreground",
  whatsapp: "bg-[hsl(142,60%,90%)] text-[hsl(142,60%,25%)]",
  email: "bg-[hsl(210,80%,90%)] text-[hsl(210,80%,30%)]",
  reuniao: "bg-[hsl(270,50%,90%)] text-[hsl(270,50%,30%)]",
  telefone: "bg-[hsl(45,90%,90%)] text-[hsl(45,90%,30%)]",
};

interface Props {
  storeId: string;
  storeName: string;
  franqueado?: string;
}

export default function StoreCommunication({ storeId, storeName, franqueado }: Props) {
  const { user } = useAuth();
  const displayName = useUserDisplayName();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [channel, setChannel] = useState<string>("interno");
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("store_communications")
      .select("*")
      .eq("store_id", storeId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Erro ao carregar mensagens");
    } else {
      setMessages((data || []) as Message[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`store_comms_${storeId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "store_communications", filter: `store_id=eq.${storeId}` },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const send = async () => {
    if (!text.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("store_communications").insert([{
      store_id: storeId,
      user_id: user.id,
      author_name: (typeof displayName === "string" ? displayName : (displayName as any)?.name) || user.email || "Equipe",
      author_role: "equipe",
      channel,
      message: text.trim(),
    }]);
    if (error) {
      toast.error("Erro ao enviar: " + error.message);
    } else {
      setText("");
      toast.success("Mensagem registrada");
    }
    setSending(false);
  };

  const togglePin = async (m: Message) => {
    const { error } = await supabase
      .from("store_communications")
      .update({ pinned: !m.pinned })
      .eq("id", m.id);
    if (error) toast.error("Sem permissão para fixar");
  };

  const remove = async (m: Message) => {
    if (!confirm("Excluir esta mensagem?")) return;
    const { error } = await supabase
      .from("store_communications")
      .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id })
      .eq("id", m.id);
    if (error) toast.error("Sem permissão para excluir");
    else load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Comunicação — {storeName}
            {franqueado && (
              <Badge variant="outline" className="ml-2 text-xs">Franqueado: {franqueado}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="w-full sm:w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(channelLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Registrar interação, decisão, combinado com franqueado…"
              className="flex-1 min-h-[60px] text-sm"
            />
            <Button onClick={send} disabled={sending || !text.trim()} className="gap-2 sm:self-end">
              <Send className="h-4 w-4" /> Enviar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use este canal para deixar registro do que foi combinado com o franqueado e da equipe interna.
            O histórico fica disponível para auditoria.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-6">Carregando…</p>
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Nenhuma mensagem registrada ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {messages.map((m) => (
            <Card key={m.id} className={m.pinned ? "border-primary/40 bg-primary/5" : ""}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{m.author_name}</span>
                    <Badge className={`text-[10px] ${channelColors[m.channel] || ""}`}>
                      {channelLabels[m.channel] || m.channel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatBR(m.created_at)} {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {m.pinned && <Badge variant="outline" className="text-[10px]">📌 Fixada</Badge>}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => togglePin(m)}
                      title={m.pinned ? "Desafixar" : "Fixar"}
                    >
                      {m.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                    </Button>
                    {m.user_id === user?.id && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => remove(m)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-line">{m.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
