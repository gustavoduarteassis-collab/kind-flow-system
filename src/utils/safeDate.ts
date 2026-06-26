// Safe date formatting helpers — never render "Invalid Date".

const parse = (input?: string | Date | null): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  const s = String(input).trim();
  if (!s) return null;
  // YYYY-MM-DD → local midnight to avoid TZ shifting the day.
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (ymd) {
    const d = new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

export const formatBR = (input?: string | Date | null, fallback = "—"): string => {
  const d = parse(input);
  return d ? d.toLocaleDateString("pt-BR") : fallback;
};

export const daysUntil = (input?: string | Date | null): number | null => {
  const d = parse(input);
  if (!d) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

export const toDate = parse;
