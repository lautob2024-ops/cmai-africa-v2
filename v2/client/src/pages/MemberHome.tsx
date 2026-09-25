import { PageShell } from "@/components/PageShell";
import { TabCard, type TabKey } from "@/components/TabCard";
import { useAuth } from "@/_core/hooks/useAuth";

const tabs: { tab: TabKey; to: string; title: string; subtitle: string }[] = [
  { tab: "courses", to: "/programmes", title: "Programmes & cours", subtitle: "Suivez vos cours chapitre par chapitre et voyez votre progression." },
  { tab: "payment", to: "/paiement", title: "Paiement", subtitle: "Réglez un cours par Mobile Money et recevez votre quittance PDF." },
  { tab: "news", to: "/actualites", title: "Articles & défis", subtitle: "Défis scientifiques, bourses et actualités universitaires." },
  { tab: "discussions", to: "/discussions", title: "Discussions", subtitle: "Posez vos questions et échangez avec la communauté." },
  { tab: "community", to: "/communaute", title: "Communauté", subtitle: "Publiez, réagissez, invitez des membres et discutez en privé." },
  { tab: "certificate", to: "/certificat", title: "Certificat", subtitle: "Demandez votre certificat après avoir terminé un cours." },
  { tab: "student", to: "/demande-etudiant", title: "Demande étudiant", subtitle: "Accès gratuit aux cours pour les étudiants justifiant leur statut." },
  { tab: "about", to: "/a-propos", title: "À propos", subtitle: "Notre vision, notre équipe et nos contacts." },
];

export default function MemberHome() {
  const { user } = useAuth();
  const name = user?.firstName || user?.name?.split(" ")[0] || "";
  return (
    <PageShell title={name ? `Bonjour ${name}` : "Espace membre"} kicker="Espace membre" description="Choisissez une rubrique. Le menu (en haut à droite) vous permet de naviguer à tout moment." wide>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {tabs.map(item => <TabCard key={item.tab} {...item} />)}
        {user?.role === "admin" && <TabCard tab="admin" to="/admin" title="Administration" subtitle="Membres, cours, paiements, e-mails et publications." />}
      </div>
    </PageShell>
  );
}
