import type { ReactNode } from "react";

export const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1f3163] disabled:cursor-not-allowed disabled:opacity-60";
export const btnOrange = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#2f6fed] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#2657c9] disabled:opacity-60";
export const btnGhost = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#cfd6e2] bg-white px-4 py-2 text-sm font-semibold text-[#14213d] transition hover:border-[#14213d] disabled:opacity-60";
export const btnDanger = "inline-flex items-center justify-center gap-2 rounded-xl border border-[#f0c9b8] bg-white px-3 py-1.5 text-xs font-semibold text-[#c94d36] transition hover:bg-[#fff1e8] disabled:opacity-60";
export const input = "form-input !mt-1";
export const label = "form-label";

export function Card({ title, subtitle, actions, children }: { title?: string; subtitle?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#dbe1ea] bg-white p-5 md:p-6">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-display text-xl font-semibold tracking-[-0.03em] text-[#14213d]">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-[#5b6b82]">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function DataTable({ head, children, empty }: { head: string[]; children: ReactNode; empty?: string }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e7ebf2]">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="bg-[#eef1f7] text-xs uppercase tracking-wide text-[#5b6b82]">
          <tr>{head.map(item => <th key={item} className="whitespace-nowrap px-3 py-3 font-bold">{item}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-[#e7ebf2]">{children}</tbody>
      </table>
      {empty && <p className="p-6 text-center text-sm text-[#5b6b82]">{empty}</p>}
    </div>
  );
}

export const Td = ({ children, className = "" }: { children: ReactNode; className?: string }) => <td className={`px-3 py-3 align-top text-[#3a4658] ${className}`}>{children}</td>;

const badgeColors = { green: "bg-[#eef1f8] text-[#2e7d56]", orange: "bg-[#fff1e8] text-[#b8431c]", gold: "bg-[#fff8df] text-[#8a5a00]", gray: "bg-[#e9edf4] text-[#51617a]" };
export const Badge = ({ color = "gray", children }: { color?: keyof typeof badgeColors; children: ReactNode }) => <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${badgeColors[color]}`}>{children}</span>;

export function splitName(user: { firstName?: string | null; lastName?: string | null; name?: string | null }) {
  if (user.firstName || user.lastName) return { first: user.firstName ?? "", last: user.lastName ?? "" };
  const parts = (user.name ?? "").trim().split(/\s+/);
  return { first: parts[0] ?? "", last: parts.slice(1).join(" ") };
}

export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const csv = "\ufeff" + rows.map(row => row.map(escape).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
