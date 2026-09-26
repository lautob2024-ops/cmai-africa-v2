import { Link } from "wouter";
import { useSeo } from "@/lib/seo";

export default function NotFound() {
  useSeo({ title: "Page introuvable", noindex: true });
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f5f7fb] p-6 text-center">
      <div>
        <div className="section-kicker">Erreur 404</div>
        <h1 className="mt-4 font-display text-5xl font-semibold tracking-[-0.06em] text-[#14213d]">Page introuvable</h1>
        <p className="mx-auto mt-4 max-w-md text-[#51617a]">Le lien est peut-être incorrect ou la page a été déplacée.</p>
        <Link href="/" className="mt-7 inline-block rounded-xl bg-[#14213d] px-6 py-3 text-sm font-semibold text-white">Retour à l'accueil</Link>
      </div>
    </div>
  );
}
