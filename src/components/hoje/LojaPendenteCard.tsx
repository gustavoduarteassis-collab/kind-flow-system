import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { LojaPendente } from "@/hooks/useLojasPendentesHoje";

export default function LojaPendenteCard({ loja }: { loja: LojaPendente }) {
  const navigate = useNavigate();
  const parado = loja.semUpdate ? "sem update" : `${loja.diasParado}d parada`;
  const parkColor =
    loja.diasParado > 30 ? "text-destructive"
    : loja.diasParado > 14 ? "text-amber-600 dark:text-amber-400"
    : "text-muted-foreground";

  const cobrar = async () => {
    const nome = loja.franqueado?.trim() ? loja.franqueado.split(/\s+/)[0] : "";
    const saudacao = nome ? `Oi ${nome}` : "Oi";
    const diasTxt = loja.semUpdate ? "sem atualização" : `há ${loja.diasParado} dias`;
    const msg = `${saudacao}: ${loja.pendenciaCurta} (${loja.nome}) está parada ${diasTxt}. Pode me atualizar?`;
    try {
      await navigator.clipboard.writeText(msg);
      toast.success("Mensagem copiada", { description: msg });
    } catch {
      toast.error("Não foi possível copiar", { description: msg });
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 space-y-2">
        <button
          className="text-left w-full"
          onClick={() => navigate(`/loja/${loja.id}`)}
        >
          <p className="font-semibold text-sm leading-tight line-clamp-2">{loja.nome}</p>
        </button>
        <div className="flex items-start gap-1.5 text-xs">
          <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${loja.severity === "alta" ? "text-destructive" : "text-amber-500"}`} />
          <span className="text-foreground/90 line-clamp-2">{loja.pendenciaCurta}</span>
        </div>
        <div className={`flex items-center gap-1 text-xs ${parkColor}`}>
          <Clock className="h-3 w-3" />
          <span>{parado}</span>
          {loja.franqueado && (
            <Badge variant="outline" className="ml-auto text-[10px] font-normal">
              {loja.franqueado.split(/\s+/)[0]}
            </Badge>
          )}
        </div>
        <Button size="sm" variant="secondary" className="w-full h-7 text-xs" onClick={cobrar}>
          <Copy className="h-3 w-3 mr-1" /> Cobrar
        </Button>
      </CardContent>
    </Card>
  );
}
