import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Send, Trash2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Msg = { role: "user" | "assistant"; content: string };

type Props = {
  mesRef: string;
  contexto: string; // human-readable string with month data
};

function renderMarkdown(text: string) {
  // Lightweight markdown: bold, italic, code, headings, lists, line breaks. No external lib.
  const esc = text
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let html = esc
    .replace(/^### (.*)$/gm, '<h3 class="font-semibold text-sm mt-3 mb-1">$1</h3>')
    .replace(/^## (.*)$/gm, '<h2 class="font-bold text-base mt-3 mb-1">$1</h2>')
    .replace(/^# (.*)$/gm, '<h1 class="font-bold text-lg mt-3 mb-2">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1 rounded text-xs">$1</code>')
    .replace(/^[-*] (.*)$/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/\n/g, "<br/>");
  return html;
}

export function AGMAssistant({ mesRef, contexto }: Props) {
  const { toast } = useToast();
  const storageKey = `agm-assistant-${mesRef}`;
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      setMessages(raw ? (JSON.parse(raw) as Msg[]) : []);
    } catch { setMessages([]); }
    taRef.current?.focus();
  }, [storageKey]);

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(messages)); } catch {}
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, storageKey]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agm-assistant`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          contexto,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        toast({ title: "Falha no assistente", description: err.error || `HTTP ${res.status}`, variant: "destructive" });
        setStreaming(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistant = "";
      setMessages((m) => [...m, { role: "assistant", content: "" }]);
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) {
              assistant += delta;
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: assistant };
                return copy;
              });
            }
          } catch { /* ignore */ }
        }
      }
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha na comunicação",
        variant: "destructive",
      });
    } finally {
      setStreaming(false);
      setTimeout(() => taRef.current?.focus(), 50);
    }
  }

  function clearChat() {
    if (!confirm("Limpar conversa do mês?")) return;
    setMessages([]);
    localStorage.removeItem(storageKey);
  }

  return (
    <Card className="flex flex-col h-[70vh]">
      <CardContent className="p-0 flex flex-col h-full">
        <div className="flex items-center gap-2 border-b px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Assistente AGM — {mesRef}</span>
          <span className="text-xs text-muted-foreground ml-auto">Contexto com dados reais do mês</span>
          {messages.length > 0 && (
            <Button size="sm" variant="ghost" onClick={clearChat}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-12">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">Comece a montar a AGM do mês.</p>
              <p className="text-xs mt-1">Ex: "Monte o texto do slide 4 — Abertura de novas lojas"</p>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
              <div
                className={
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-lg px-3 py-2 max-w-[80%] text-sm whitespace-pre-line"
                    : "text-sm leading-relaxed max-w-full"
                }
                {...(m.role === "assistant"
                  ? { dangerouslySetInnerHTML: { __html: renderMarkdown(m.content || "...") } }
                  : { children: m.content })}
              />
            </div>
          ))}
          {streaming && messages[messages.length - 1]?.role === "user" && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Pensando…
            </div>
          )}
        </div>

        <div className="border-t p-3 flex gap-2 items-end">
          <Textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
            }}
            placeholder="Pergunte ou peça um slide… (Enter envia, Shift+Enter quebra linha)"
            rows={2}
            className="resize-none"
            disabled={streaming}
          />
          <Button onClick={send} disabled={streaming || !input.trim()} size="icon">
            {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
