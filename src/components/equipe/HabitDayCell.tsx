import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { StickyNote } from "lucide-react";

type Props = {
  done: boolean;
  isToday: boolean;
  note: string | null;
  onToggle: (note: string | null) => void | Promise<void>;
};

export function HabitDayCell({ done, isToday, note, onToggle }: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(note ?? "");

  const handleOpen = (o: boolean) => {
    setOpen(o);
    if (o) setDraft(note ?? "");
  };

  const handleConfirm = async () => {
    await onToggle(draft.trim() ? draft.trim() : null);
    setOpen(false);
  };

  const handleUncheck = async () => {
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
        <div className="text-xs font-medium text-muted-foreground">
          {done ? "Editar nota" : "Marcar como concluído"}
        </div>
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Nota opcional (observação, dificuldade, etc.)"
          rows={3}
          className="text-xs"
        />
        <div className="flex gap-2 justify-end">
          {done && (
            <Button size="sm" variant="ghost" onClick={handleUncheck}>
              Desmarcar
            </Button>
          )}
          <Button size="sm" onClick={handleConfirm}>
            {done ? "Salvar" : "Concluir"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
