import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus } from "lucide-react";

type Subtask = { id: string; title: string; done: boolean };

interface Props {
  taskId: string;
  initial: Subtask[];
}

export function SubtasksEditor({ taskId, initial }: Props) {
  const [items, setItems] = useState<Subtask[]>(initial || []);
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    setItems(Array.isArray(initial) ? initial : []);
  }, [taskId, initial]);

  const save = async (next: Subtask[]) => {
    setItems(next);
    await supabase.from("tasks").update({ subtasks: next as any }).eq("id", taskId);
  };

  const add = () => {
    const t = newTitle.trim();
    if (!t) return;
    save([...items, { id: crypto.randomUUID(), title: t, done: false }]);
    setNewTitle("");
  };

  const toggle = (id: string) =>
    save(items.map((s) => (s.id === id ? { ...s, done: !s.done } : s)));

  const remove = (id: string) => save(items.filter((s) => s.id !== id));

  const done = items.filter((i) => i.done).length;
  const total = items.length;

  return (
    <div className="border-t pt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">✅ Subtarefas</h3>
        {total > 0 && (
          <span className="text-xs text-muted-foreground">{done}/{total}</span>
        )}
      </div>
      {total > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-[hsl(var(--success))] transition-all"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      )}
      <div className="space-y-1 mb-2 max-h-[180px] overflow-y-auto">
        {items.map((s) => (
          <div key={s.id} className="flex items-center gap-2 group">
            <Checkbox checked={s.done} onCheckedChange={() => toggle(s.id)} />
            <span className={`text-sm flex-1 ${s.done ? "line-through text-muted-foreground" : ""}`}>
              {s.title}
            </span>
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={() => remove(s.id)}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
        {total === 0 && <p className="text-xs text-muted-foreground py-2">Nenhuma subtarefa.</p>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Nova subtarefa..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          className="h-8 text-sm"
        />
        <Button size="sm" onClick={add} className="gap-1"><Plus className="h-3 w-3" /> Add</Button>
      </div>
    </div>
  );
}
