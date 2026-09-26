import { useRequireAuth } from "@/_core/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { useSeo } from "@/lib/seo";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

/** Structure commune des pages de l'espace membre : garde de connexion, en-tête avec menu, titre. */
export function PageShell({ title, kicker, description, children, wide }: { title: string; kicker?: string; description?: string; children: ReactNode; wide?: boolean }) {
  const { ready } = useRequireAuth();
  useSeo({ title, noindex: true });
  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb]" role="status" aria-label="Chargement">
        <Loader2 className="h-6 w-6 animate-spin text-[#2f6fed]" />
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-[#f5f7fb] text-[#0f1b2d]">
      <AppHeader title={title} />
      <main className={`container py-10 md:py-14 ${wide ? "" : "max-w-6xl"}`}>
        {kicker && <div className="section-kicker">{kicker}</div>}
        <h1 className="mt-3 font-display text-4xl font-semibold leading-[1] tracking-[-0.06em] text-[#14213d] md:text-5xl">{title}</h1>
        {description && <p className="mt-4 max-w-2xl leading-7 text-[#51617a]">{description}</p>}
        <div className="mt-9">{children}</div>
      </main>
    </div>
  );
}
