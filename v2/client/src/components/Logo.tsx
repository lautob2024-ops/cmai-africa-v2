import { cn } from "@/lib/utils";

/** Logo CMAI+Africa. Si /images/logo.jpg est absent, un logo de remplacement s'affiche automatiquement. */
export function Logo({ className }: { className?: string }) {
  return <img src="/images/logo.jpg" alt="Logo CMAI+Africa" width={40} height={40} decoding="async" className={cn("h-10 w-10 rounded-[13px] object-cover", className)} />;
}

export function BrandMark() {
  return (
    <span className="flex items-center gap-3">
      <Logo className="shadow-[0_8px_20px_rgba(25,63,54,0.18)]" />
      <span className="leading-none">
        <span className="block font-display text-[1.02rem] font-semibold tracking-[-0.03em] text-[#17231f]">
          CMAI<span className="text-[#eb6a3d]">+</span>AFRICA
        </span>
        <span className="mt-1 block text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#718078]">Learn · Experiment · Innovate</span>
      </span>
    </span>
  );
}
