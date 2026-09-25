import { cn } from "@/lib/utils";

export function ProgressBar({ value, className, label }: { value: number; className?: string; label?: string }) {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cn("h-2.5 w-full overflow-hidden rounded-full bg-[#e6ebe4]", className)} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? "Progression"}>
      <div className="h-full rounded-full bg-[#2e7d56] transition-[width] duration-500" style={{ width: `${percent}%` }} />
    </div>
  );
}
