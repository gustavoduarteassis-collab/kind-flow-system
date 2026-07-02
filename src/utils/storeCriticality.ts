// Regras de criticidade compartilhadas entre Mural de Obras e Matriz de Etapas.
// Uma loja é "crítica" quando pelo menos um sinal abaixo dispara.
import { Store } from "@/data/checklistData";

export type CriticalReason = {
  code: "atraso_data" | "inaug_proxima_baixo_progresso" | "sem_atualizacao" | "checklist_pendente";
  label: string;
  severity: "alta" | "media";
};

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  const iso = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const br = String(s).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1]);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

const DAY_MS = 86_400_000;

export function daysUntil(s?: string | null): number | null {
  const d = parseDate(s);
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / DAY_MS);
}

export function daysSince(s?: string | null): number | null {
  const d = parseDate(s);
  if (!d) return null;
  return Math.round((Date.now() - d.getTime()) / DAY_MS);
}

/** Retorna a próxima data-chave e seu label (nome do marco). */
export function nextMilestone(store: Store): { label: string; date: string; days: number } | null {
  const marcos: [string, string | undefined][] = [
    ["Demolição", store.demolicaoReal || store.demolicaoPrev],
    ["Início de obra", store.obraInicioReal || store.obraInicioPrev],
    ["Móveis", store.moveisReal || store.moveisPrev],
    ["Produtos", store.produtosReal || store.produtosPrev],
    ["Inauguração", store.inauguracaoReal || store.inauguracao],
  ];
  const opts = marcos
    .map(([label, d]) => ({ label, date: d || "", days: daysUntil(d) }))
    .filter((m) => m.days !== null && m.days >= 0) as { label: string; date: string; days: number }[];
  opts.sort((a, b) => a.days - b.days);
  return opts[0] || null;
}

export function computeCriticality(
  store: Store,
  ctx: { progressPct: number; inaugurada: boolean }
): CriticalReason[] {
  const reasons: CriticalReason[] = [];
  if (ctx.inaugurada) return reasons;

  // 1) Atraso — data real ainda vazia e prev já passou
  const pares: [string, string | undefined, string | undefined][] = [
    ["Demolição", store.demolicaoPrev, store.demolicaoReal],
    ["Início de obra", store.obraInicioPrev, store.obraInicioReal],
    ["Móveis", store.moveisPrev, store.moveisReal],
    ["Produtos", store.produtosPrev, store.produtosReal],
  ];
  for (const [nome, prev, real] of pares) {
    if (real) continue;
    const d = daysUntil(prev);
    if (d !== null && d < 0) {
      reasons.push({
        code: "atraso_data",
        label: `${nome} atrasado ${Math.abs(d)}d`,
        severity: Math.abs(d) > 7 ? "alta" : "media",
      });
    }
  }

  // 2) Inauguração próxima com progresso baixo
  const dInaug = daysUntil(store.inauguracaoReal || store.inauguracao);
  if (dInaug !== null && dInaug >= 0) {
    if (dInaug <= 30 && ctx.progressPct < 60) {
      reasons.push({
        code: "inaug_proxima_baixo_progresso",
        label: `Inaugura em ${dInaug}d • ${Math.round(ctx.progressPct)}%`,
        severity: dInaug <= 15 ? "alta" : "media",
      });
    }
  }

  // 3) Sem atualização há > 14 dias
  const stale = daysSince(store.ultimaAtualizacaoAt);
  if (stale === null || stale > 14) {
    reasons.push({
      code: "sem_atualizacao",
      label: stale === null ? "Sem atualização registrada" : `Sem update há ${stale}d`,
      severity: (stale ?? 999) > 30 ? "alta" : "media",
    });
  }

  return reasons;
}

export function highestSeverity(reasons: CriticalReason[]): "alta" | "media" | null {
  if (reasons.some((r) => r.severity === "alta")) return "alta";
  if (reasons.length) return "media";
  return null;
}
