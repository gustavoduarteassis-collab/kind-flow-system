/**
 * Regras de detecção de loja Inaugurada no funil.
 *
 * Uma loja é considerada Inaugurada quando o campo `status_geral` do
 * pipeline_stores começa com a palavra "inaugurada" (case/acentos
 * insensíveis). Isso cobre tanto a marcação manual no funil
 * (Pipeline.markInaugurada gera "Inaugurada em dd/mm/yyyy ...") quanto
 * a importação do Excel (ImportFunil força status_geral = "Inaugurada"
 * quando a linha vem da aba Inauguradas).
 */

const stripAccents = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function isInauguradaStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  const normalized = stripAccents(String(status)).trim().toLowerCase();
  return normalized.startsWith("inaugurada");
}

export type PipelineStatusRow = {
  filial: string | null;
  status_geral: string | null;
};

export function buildInauguradasFiliais(
  rows: PipelineStatusRow[] | null | undefined
): Set<string> {
  const set = new Set<string>();
  if (!rows) return set;
  rows.forEach((r) => {
    if (r.filial && isInauguradaStatus(r.status_geral)) {
      set.add(String(r.filial));
    }
  });
  return set;
}
