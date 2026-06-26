import { useEffect, useRef, useState, ReactNode } from "react";
import { TabsList } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * TabsList horizontal com setas ‹ › que aparecem só quando há overflow.
 * Cada clique nas setas faz scroll de ~70% da largura visível.
 */
export function TabsScrollableList({ children, className }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    // Reavalia após render dos filhos
    const t = setTimeout(updateArrows, 100);
    return () => {
      el.removeEventListener("scroll", updateArrows);
      window.removeEventListener("resize", updateArrows);
      clearTimeout(t);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.7 * (dir === "left" ? -1 : 1);
    el.scrollBy({ left: amount, behavior: "smooth" });
  };

  return (
    <div className="relative">
      {canLeft && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Rolar abas à esquerda"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full shadow-md border bg-background/95 backdrop-blur"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}
      {canRight && (
        <Button
          type="button"
          variant="secondary"
          size="icon"
          aria-label="Rolar abas à direita"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-20 h-8 w-8 rounded-full shadow-md border bg-background/95 backdrop-blur"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
      <div
        ref={scrollRef}
        className={cn(
          "overflow-x-auto scroll-smooth pb-2",
          canLeft && "pl-10",
          canRight && "pr-10",
        )}
        style={{ scrollbarWidth: "thin" }}
      >
        <TabsList className={cn("h-auto inline-flex w-max gap-1 bg-transparent p-0", className)}>
          {children}
        </TabsList>
      </div>
    </div>
  );
}
