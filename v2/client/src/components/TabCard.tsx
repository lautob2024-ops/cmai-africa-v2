import { ArrowUpRight, Award, BookOpen, CreditCard, GraduationCap, Info, MessagesSquare, Newspaper, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Link } from "wouter";

export type TabKey = "courses" | "payment" | "news" | "discussions" | "community" | "certificate" | "student" | "about" | "admin";

const scenes: Record<TabKey, { icon: LucideIcon; from: string; to: string; accent: string }> = {
  courses: { icon: BookOpen, from: "#193f36", to: "#2e7d56", accent: "#f6c65a" },
  payment: { icon: CreditCard, from: "#7a3b12", to: "#eb6a3d", accent: "#ffe2b8" },
  news: { icon: Newspaper, from: "#1f3b63", to: "#3f7fb8", accent: "#bfe0ff" },
  discussions: { icon: MessagesSquare, from: "#4a2c6b", to: "#8a5cc2", accent: "#ecd9ff" },
  community: { icon: Users, from: "#0f5c5a", to: "#2fa79f", accent: "#c8fff6" },
  certificate: { icon: Award, from: "#8a5a00", to: "#e0a92a", accent: "#fff2c2" },
  student: { icon: GraduationCap, from: "#20443c", to: "#5a9a6a", accent: "#e4ffd9" },
  about: { icon: Info, from: "#33413b", to: "#718078", accent: "#f1f5ef" },
  admin: { icon: ShieldCheck, from: "#3a1f1a", to: "#c94d36", accent: "#ffd6cc" },
};

/** Carte d'onglet : visuel animé en arrière-plan + nom de l'onglet inscrit dessus. Dépose /images/tabs/<clé>.jpg pour la remplacer par une vraie photo. */
export function TabCard({ tab, to, title, subtitle }: { tab: TabKey; to: string; title: string; subtitle: string }) {
  const scene = scenes[tab];
  const Icon = scene.icon;
  return (
    <Link
      href={to}
      className="tab-card group relative block h-[220px] overflow-hidden rounded-[1.6rem] border border-black/5 shadow-[0_10px_30px_rgba(25,63,54,0.12)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_rgba(25,63,54,0.2)]"
      style={{ background: `linear-gradient(135deg, ${scene.from}, ${scene.to})` }}
      aria-label={`${title} — ${subtitle}`}
    >
      <div className="tab-art absolute inset-0" aria-hidden="true">
        <span className="tab-orbit tab-orbit-a" style={{ borderColor: `${scene.accent}55` }} />
        <span className="tab-orbit tab-orbit-b" style={{ borderColor: `${scene.accent}33` }} />
        <span className="tab-blob" style={{ background: scene.accent }} />
        <span className="tab-dot tab-dot-a" style={{ background: scene.accent }} />
        <span className="tab-dot tab-dot-b" style={{ background: scene.accent }} />
        <Icon className="tab-icon absolute right-6 top-6 h-24 w-24 opacity-90" style={{ color: scene.accent }} strokeWidth={1.2} />
      </div>
      <img
        src={`/images/tabs/${tab}.jpg`}
        alt=""
        data-fallback="1"
        loading="lazy"
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
        onError={event => { event.currentTarget.style.display = "none"; }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
        <div className="min-w-0">
          <h2 className="font-display text-2xl font-semibold tracking-[-0.04em]">{title}</h2>
          <p className="mt-1 line-clamp-2 text-sm text-white/80">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur transition group-hover:bg-white group-hover:text-[#193f36]">
          <ArrowUpRight className="h-5 w-5" />
        </span>
      </div>
    </Link>
  );
}
