import { useRequireAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/Logo";
import { CertificatesTab, OverviewTab, PaymentsTab, PostsTab, ProgressTab, StudentsTab } from "@/components/admin/OtherTabs";
import { CoursesTab } from "@/components/admin/CoursesTab";
import { EmailTab } from "@/components/admin/EmailTab";
import { MembersTab } from "@/components/admin/MembersTab";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useSeo } from "@/lib/seo";
import { Award, Banknote, BookOpen, Clock3, FileText, GraduationCap, Home, LayoutDashboard, Loader2, LogOut, Mail, Menu, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

const TABS = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutDashboard },
  { id: "members", label: "Membres", icon: Users },
  { id: "courses", label: "Cours & chapitres", icon: BookOpen },
  { id: "posts", label: "Publications", icon: FileText },
  { id: "payments", label: "Paiements", icon: Banknote },
  { id: "progress", label: "Progression", icon: Clock3 },
  { id: "certificates", label: "Certificats", icon: Award },
  { id: "students", label: "Dossiers étudiants", icon: GraduationCap },
  { id: "email", label: "E-mails", icon: Mail },
] as const;
type TabId = (typeof TABS)[number]["id"];

const readTab = (): TabId => {
  const wanted = new URLSearchParams(window.location.search).get("tab");
  return (TABS.find(item => item.id === wanted)?.id ?? "overview") as TabId;
};

export default function Admin() {
  useSeo({ title: "Administration", noindex: true });
  const { ready, logout, user } = useRequireAuth({ admin: true });
  const [tab, setTab] = useState<TabId>(readTab);
  const [emailTo, setEmailTo] = useState("");

  const go = (next: string) => {
    setTab(next as TabId);
    window.history.replaceState(null, "", `/admin?tab=${next}`);
    window.scrollTo({ top: 0 });
  };
  useEffect(() => { const onPop = () => setTab(readTab()); window.addEventListener("popstate", onPop); return () => window.removeEventListener("popstate", onPop); }, []);

  if (!ready) return <div className="flex min-h-screen items-center justify-center bg-[#f8f7f3]" role="status" aria-label="Chargement"><Loader2 className="h-6 w-6 animate-spin text-[#eb6a3d]" /></div>;

  const nav = (close = false) => (
    <nav className="flex flex-col gap-1" aria-label="Sections d'administration">
      {TABS.map(({ id, label, icon: Icon }) => {
        const button = (
          <button key={id} onClick={() => go(id)} aria-current={tab === id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${tab === id ? "bg-[#193f36] text-white" : "text-[#3f4d46] hover:bg-white"}`}>
            <Icon className="h-4 w-4" /> {label}
          </button>
        );
        return close ? <SheetClose asChild key={id}>{button}</SheetClose> : button;
      })}
      <div className="my-2 border-t border-[#e2dfd5]" />
      {close ? <SheetClose asChild><Link href="/home" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#3f4d46] hover:bg-white"><Home className="h-4 w-4" /> Espace membre</Link></SheetClose> : <Link href="/home" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#3f4d46] hover:bg-white"><Home className="h-4 w-4" /> Espace membre</Link>}
      <button onClick={() => void logout()} className="flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#c94d36] hover:bg-white"><LogOut className="h-4 w-4" /> Se déconnecter</button>
    </nav>
  );

  const current = TABS.find(item => item.id === tab)!;
  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#17231f]">
      <header className="sticky top-0 z-40 border-b border-[#e2dfd5] bg-white/90 backdrop-blur-xl">
        <div className="flex h-[68px] items-center justify-between gap-3 px-4 md:px-8">
          <BrandMark />
          <span className="hidden text-sm font-semibold text-[#193f36] md:block">Administration · {current.label}</span>
          <Sheet>
            <SheetTrigger asChild>
              <button type="button" aria-label="Ouvrir le menu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9d6cf] bg-white text-[#193f36] lg:hidden"><Menu className="h-6 w-6" /></button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[290px] bg-[#f8f7f3] p-0">
              <SheetHeader className="border-b border-[#e2dfd5] p-5 text-left"><SheetTitle className="font-display text-xl text-[#193f36]">Administration</SheetTitle><SheetDescription className="truncate text-xs">{user?.email}</SheetDescription></SheetHeader>
              <div className="p-3">{nav(true)}</div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <div className="grid lg:grid-cols-[260px_1fr]">
        <aside className="sticky top-[68px] hidden h-[calc(100vh-68px)] overflow-y-auto border-r border-[#e2dfd5] p-4 lg:block">{nav()}</aside>
        <main className="min-w-0 p-4 md:p-8">
          <h1 className="mb-6 font-display text-3xl font-semibold tracking-[-0.05em] text-[#193f36] md:hidden">{current.label}</h1>
          {tab === "overview" && <OverviewTab go={go} />}
          {tab === "members" && <MembersTab onWrite={email => { setEmailTo(email); go("email"); }} />}
          {tab === "courses" && <CoursesTab />}
          {tab === "posts" && <PostsTab />}
          {tab === "payments" && <PaymentsTab />}
          {tab === "progress" && <ProgressTab />}
          {tab === "certificates" && <CertificatesTab />}
          {tab === "students" && <StudentsTab />}
          {tab === "email" && <EmailTab presetTo={emailTo} />}
        </main>
      </div>
    </div>
  );
}
