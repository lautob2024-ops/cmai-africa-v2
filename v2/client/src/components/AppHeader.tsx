import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/Logo";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Award, BookOpen, CreditCard, GraduationCap, Home, Info, LogOut, Menu, MessagesSquare, Newspaper, ShieldCheck, Users } from "lucide-react";
import { Link, useLocation } from "wouter";

const items = [
  { to: "/home", label: "Espace membre", icon: Home },
  { to: "/programmes", label: "Programmes & cours", icon: BookOpen },
  { to: "/paiement", label: "Paiement", icon: CreditCard },
  { to: "/actualites", label: "Articles & défis", icon: Newspaper },
  { to: "/discussions", label: "Discussions", icon: MessagesSquare },
  { to: "/communaute", label: "Communauté", icon: Users },
  { to: "/certificat", label: "Certificat", icon: Award },
  { to: "/demande-etudiant", label: "Demande étudiant", icon: GraduationCap },
  { to: "/a-propos", label: "À propos", icon: Info },
];

/** En-tête commun de l'espace membre : logo + bouton « menu » (trois barres) qui ouvre le panneau de navigation. */
export function AppHeader({ title }: { title?: string }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  return (
    <header className="sticky top-0 z-40 border-b border-[#e2dfd5] bg-white/90 backdrop-blur-xl">
      <div className="container flex h-[68px] items-center justify-between gap-3">
        <Link href="/home" aria-label="Retour à l'espace membre"><BrandMark /></Link>
        {title && <span className="hidden truncate text-sm font-semibold text-[#193f36] md:block">{title}</span>}
        <Sheet>
          <SheetTrigger asChild>
            <button type="button" aria-label="Ouvrir le menu" className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#d9d6cf] bg-white text-[#193f36] transition hover:border-[#193f36]">
              <Menu className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[300px] border-l border-[#e2dfd5] bg-[#f8f7f3] p-0 sm:max-w-[320px]">
            <SheetHeader className="border-b border-[#e2dfd5] p-5 text-left">
              <SheetTitle className="font-display text-xl text-[#193f36]">Navigation</SheetTitle>
              <SheetDescription className="truncate text-xs">{user ? `${user.firstName || user.name || ""} · ${user.email ?? ""}` : "Menu"}</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-1 p-3" aria-label="Menu principal">
              {items.map(({ to, label, icon: Icon }) => (
                <SheetClose asChild key={to}>
                  <Link href={to} className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${location.startsWith(to) ? "bg-[#193f36] text-white" : "text-[#3f4d46] hover:bg-white"}`}>
                    <Icon className="h-4 w-4" /> {label}
                  </Link>
                </SheetClose>
              ))}
              {user?.role === "admin" && (
                <SheetClose asChild>
                  <Link href="/admin" className="mt-2 flex items-center gap-3 rounded-xl border border-[#f0c9b8] bg-[#fff1e8] px-4 py-3 text-sm font-semibold text-[#b8431c]">
                    <ShieldCheck className="h-4 w-4" /> Administration
                  </Link>
                </SheetClose>
              )}
              <button onClick={() => void logout()} className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#c94d36] hover:bg-white">
                <LogOut className="h-4 w-4" /> Se déconnecter
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
