import { PageShell } from "@/components/PageShell";
import { Facebook, MessageCircle, Phone } from "lucide-react";

export default function About() {
  return (
    <PageShell title="À propos de CMAI+Africa" kicker="Notre projet" description="Les mathématiques pour comprendre. L'informatique pour construire. L'intelligence artificielle pour innover.">
      <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-[#e2dfd5] bg-white p-7 leading-8 text-[#3f4d46]">
          <h2 className="font-display text-2xl font-semibold text-[#193f36]">Une communauté africaine qui avance pas à pas</h2>
          <p className="mt-4">CMAI+Africa est un projet de communauté scientifique qui veut rapprocher les jeunes des sciences et montrer leur rôle dans les problèmes réels.</p>
          <p className="mt-4">Nous partageons des ressources, des défis de réflexion, des actualités universitaires, des formations et des opportunités pour les étudiants et les passionnés de mathématiques, d'informatique et de recherche.</p>
        </section>
        <section className="rounded-3xl bg-[#193f36] p-7 text-white">
          <h2 className="font-display text-2xl font-semibold">Rejoignez la conversation</h2>
          <p className="mt-3 text-sm leading-6 text-white/75">Suivez les annonces et les prochaines activités de CMAI+Africa.</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href="https://web.facebook.com/profile.php?id=61590364331390" target="_blank" rel="noreferrer" className="social-button dark justify-center"><Facebook className="h-4 w-4" /> Facebook</a>
            <a href="https://whatsapp.com/channel/0029VbDGLdv7Noa9ZvXIjf2p" target="_blank" rel="noreferrer" className="social-button dark justify-center"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
            <a href="tel:+2290166390751" className="social-button dark justify-center"><Phone className="h-4 w-4" /> +229 01 66 39 07 51</a>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
