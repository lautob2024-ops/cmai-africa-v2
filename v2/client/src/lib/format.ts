export function formatSeconds(total: number) {
  const seconds = Math.max(0, Math.round(total));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h} h ${String(m).padStart(2, "0")} min`;
  if (m) return `${m} min ${String(s).padStart(2, "0")} s`;
  return `${s} s`;
}

export function formatPrice(priceCents: number, currency: string) {
  if (priceCents <= 0) return "Gratuit";
  const value = (priceCents / 100).toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return currency === "XOF" ? `${value} F CFA` : currency === "USD" ? `${value} $` : `${value} ${currency}`;
}

export function formatDate(value: string | Date | null | undefined, withTime = false) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR", { dateStyle: "medium", ...(withTime ? { timeStyle: "short" } : {}) });
}

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join("") || "M";

export function fullName(user: { firstName?: string | null; lastName?: string | null; name?: string | null; email?: string | null }) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || user.name || user.email || "Membre";
}
