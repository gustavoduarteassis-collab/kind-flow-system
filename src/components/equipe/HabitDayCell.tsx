import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote, Loader2, Check } from "lucide-react";

type Props = {
  done: boolean;
  isToday: boolean;
  note: string | null;
  onToggle: (note: string | null) => void | Promise<void>;
};

type SaveStatus = "idle" | "saving" | "saved";

export function HabitDayCell({ done, isToday, note, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<string>(note ?? "");
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) {
      setDraft(note ?? "");
      savedRef.current = note ?? "";
      setStatus("idle");
    } else {
      // flush pending debounce on close (only when already done)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
        if (done && draft !== savedRef.current) {
          void persist(draft);
        }
      }
    }
  };

  const persist = async (value: string) => {
    setStatus("saving");
    await onToggle(value.trim() ? value.trim() : null);
    savedRef.current = value;
    setStatus("saved");
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => setStatus("idle"), 1500);
  };

  // Debounced autosave — only when completion already exists
  useEffect(() => {
    if (!open || !done) return;
    if (draft === savedRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus("saving");
    debounceRef.current = setTimeout(() => {
      void persist(draft);
    }, 700);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, open, done]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const handleConfirm = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await persist(draft);
    setOpen(false);
  };

  const handleUncheck = async () => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    await onToggle(null);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`relative w-6 h-6 rounded-md border transition-all ${
            done
              ? "bg-primary border-primary text-primary-foreground"
              : isToday
              ? "border-primary/50 bg-primary/5"
              : "border-border/50"
          }`}
          title={note ? `Nota: ${note}` : undefined}
        >
          {done && <span className="text-[10px]">✓</span>}
          {note && (
            <StickyNote
              className={`absolute -top-1 -right-1 h-2.5 w-2.5 ${
                done ? "text-amber-200" : "text-amber-500"
              }`}
              strokeWidth={3}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 space-y-2" align="center">
        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span>{done ? "Editar nota" : "Marcar como concluído"}</span>
          {done && (
            <span className="flex items-center gap-1 text-[10px] font-normal">
              {status === "saving" && (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" /> salvando…
                </>
              )}
              {status === "saved" && (
                <>
                  <Check className="h-3 w-3 text-emerald-500" /> salvo
                </>
              )}
            </span>
          )}
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nota opcional (observação, dificuldade, etc.)"
          rows={3}
          className="text-xs"
        />
        <div className="flex gap-2 justify-end">
          {done ? (
            <Button size="sm" variant="ghost" onClick={handleUncheck}>
              Desmarcar
            </Button>
          ) : (
            <Button size="sm" onClick={handleConfirm}>
              Concluir
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
