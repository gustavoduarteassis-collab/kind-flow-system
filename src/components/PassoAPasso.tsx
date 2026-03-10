import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FileText, ChevronDown, ChevronRight, Mail, Paperclip,
  AlertTriangle, Search, Download,
} from "lucide-react";
import { passosData, type PassoItem } from "@/data/passosData";

const PassoAPasso = () => {
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const printRef = useRef<HTMLDivElement>(null);

  const toggle = (id: string) =>
    setOpenItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const filtered = passosData.filter(
    (p) =>
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const generatePDF = (item: PassoItem) => {
    const w = window.open("", "_blank");
    if (!w) return;

    const emailSection = item.emailPara
      ? `
      <div class="section">
        <h3>📧 E-mail</h3>
        <p><strong>Para:</strong> ${item.emailPara.join("; ")}</p>
        ${item.emailCopia ? `<p><strong>Cópia:</strong> ${item.emailCopia.join("; ")}</p>` : ""}
        ${item.assunto ? `<p><strong>Assunto:</strong> ${item.assunto}</p>` : ""}
      </div>`
      : "";

    const corpoSection = item.corpoEmail
      ? `
      <div class="section">
        <h3>📝 Modelo de E-mail</h3>
        <div class="email-body">${item.corpoEmail.replace(/\n/g, "<br>")}</div>
      </div>`
      : "";

    const anexosSection = item.anexos?.length
      ? `
      <div class="section">
        <h3>📎 Anexos Necessários</h3>
        <ul>${item.anexos.map((a) => `<li>${a}</li>`).join("")}</ul>
      </div>`
      : "";

    const obsSection = item.observacoes?.length
      ? `
      <div class="section obs">
        <h3>⚠️ Observações Importantes</h3>
        <ul>${item.observacoes.map((o) => `<li>${o}</li>`).join("")}</ul>
      </div>`
      : "";

    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${item.titulo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1a1a1a; line-height: 1.6; }
  .header { border-bottom: 3px solid #8B6914; padding-bottom: 16px; margin-bottom: 24px; }
  .header h1 { font-size: 22px; color: #8B6914; }
  .header p { font-size: 13px; color: #666; margin-top: 4px; }
  .meta { display: flex; gap: 24px; margin-bottom: 20px; }
  .meta-box { flex: 1; background: #f8f6f0; border-left: 3px solid #8B6914; padding: 12px 16px; border-radius: 4px; }
  .meta-box h4 { font-size: 11px; text-transform: uppercase; color: #8B6914; margin-bottom: 4px; }
  .meta-box p { font-size: 13px; }
  .section { margin-bottom: 20px; }
  .section h3 { font-size: 15px; color: #333; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
  .steps { counter-reset: step; }
  .step { counter-increment: step; padding: 8px 0 8px 36px; position: relative; font-size: 13px; border-bottom: 1px dotted #e5e5e5; }
  .step::before { content: counter(step); position: absolute; left: 0; top: 8px; width: 24px; height: 24px; background: #8B6914; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; }
  .email-body { background: #f9f9f9; border: 1px solid #e0e0e0; padding: 16px; border-radius: 4px; font-size: 13px; white-space: pre-wrap; }
  ul { padding-left: 20px; }
  li { font-size: 13px; margin-bottom: 4px; }
  .obs { background: #fff8e1; border: 1px solid #ffe082; padding: 12px 16px; border-radius: 4px; }
  .obs h3 { border: none; }
  .footer { margin-top: 32px; border-top: 1px solid #ddd; padding-top: 12px; font-size: 11px; color: #999; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head><body>
  <div class="header">
    <h1>${item.titulo}</h1>
    <p>${item.descricao}</p>
  </div>
  ${item.oQueE || item.quandoPedir ? `<div class="meta">
    ${item.oQueE ? `<div class="meta-box"><h4>O que é?</h4><p>${item.oQueE}</p></div>` : ""}
    ${item.quandoPedir ? `<div class="meta-box"><h4>Quando pedir?</h4><p>${item.quandoPedir}</p></div>` : ""}
  </div>` : ""}
  ${item.importante ? `<div class="section obs"><h3>⚠️ Importante</h3><p style="font-size:13px">${item.importante}</p></div>` : ""}
  <div class="section">
    <h3>📋 Passo a Passo</h3>
    <div class="steps">${item.passos.map((p) => `<div class="step">${p}</div>`).join("")}</div>
  </div>
  ${emailSection}
  ${corpoSection}
  ${anexosSection}
  ${obsSection}
  <div class="footer">Constance Franquias — Documento gerado em ${new Date().toLocaleDateString("pt-BR")}</div>
</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar procedimento..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Items */}
      <div className="space-y-3" ref={printRef}>
        {filtered.map((item) => (
          <Card key={item.id}>
            <Collapsible open={openItems[item.id]} onOpenChange={() => toggle(item.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold">{item.titulo}</CardTitle>
                        <p className="text-xs text-muted-foreground">{item.descricao}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs h-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          generatePDF(item);
                        }}
                      >
                        <Download className="h-3.5 w-3.5" />
                        PDF
                      </Button>
                      {openItems[item.id] ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 space-y-4">
                  {/* O que é / Quando pedir */}
                  {(item.oQueE || item.quandoPedir) && (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {item.oQueE && (
                        <div className="border-l-2 border-primary pl-3">
                          <p className="text-xs font-semibold text-primary mb-1">O que é?</p>
                          <p className="text-xs text-muted-foreground">{item.oQueE}</p>
                        </div>
                      )}
                      {item.quandoPedir && (
                        <div className="border-l-2 border-primary pl-3">
                          <p className="text-xs font-semibold text-primary mb-1">Quando pedir?</p>
                          <p className="text-xs text-muted-foreground">{item.quandoPedir}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Importante */}
                  {item.importante && (
                    <div className="bg-[hsl(var(--accent))]/10 border border-[hsl(var(--accent))]/20 rounded-lg p-3 flex gap-2">
                      <AlertTriangle className="h-4 w-4 text-[hsl(var(--accent))] shrink-0 mt-0.5" />
                      <p className="text-xs">{item.importante}</p>
                    </div>
                  )}

                  {/* Steps */}
                  <div>
                    <p className="text-xs font-semibold mb-2">Passo a Passo:</p>
                    <ol className="space-y-2">
                      {item.passos.map((passo, i) => (
                        <li key={i} className="flex gap-3 text-xs">
                          <span className="shrink-0 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {i + 1}
                          </span>
                          <span className="pt-0.5">{passo}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Email info */}
                  {item.emailPara && (
                    <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <p className="text-xs font-semibold">Dados do E-mail</p>
                      </div>
                      <div className="text-xs space-y-1">
                        <p><span className="font-medium">Para:</span> {item.emailPara.join("; ")}</p>
                        {item.emailCopia && (
                          <p><span className="font-medium">Cópia:</span> {item.emailCopia.join("; ")}</p>
                        )}
                        {item.assunto && (
                          <p><span className="font-medium">Assunto:</span> {item.assunto}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Email body */}
                  {item.corpoEmail && (
                    <div>
                      <p className="text-xs font-semibold mb-1.5">Modelo de E-mail:</p>
                      <pre className="bg-muted/50 border rounded-lg p-3 text-xs whitespace-pre-wrap font-sans">
                        {item.corpoEmail}
                      </pre>
                    </div>
                  )}

                  {/* Anexos */}
                  {item.anexos && item.anexos.length > 0 && (
                    <div className="flex items-start gap-2">
                      <Paperclip className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold mb-1">Anexos Necessários:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {item.anexos.map((a, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px]">{a}</Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Observações */}
                  {item.observacoes && item.observacoes.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-xs font-semibold mb-1.5 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" /> Observações:
                      </p>
                      <ul className="space-y-1">
                        {item.observacoes.map((o, i) => (
                          <li key={i} className="text-xs text-muted-foreground">• {o}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PassoAPasso;
