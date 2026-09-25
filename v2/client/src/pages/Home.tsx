import { FormEvent, useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useSeo } from "@/lib/seo";
import { Button } from "@/components/ui/button";
import { ArrowRight, Atom, BarChart3, BrainCircuit, Check, ChevronDown, Code2, FlaskConical, Globe2, GraduationCap, Loader2, Mail, Menu, Network, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

const logo = "/images/logo.jpg";
const heroPhotos = [
  { src: "/images/slide-1.jpg", alt: "Étudiants africains en data science" },
  { src: "/images/slide-2.jpg", alt: "Communauté africaine d’innovation" },
  { src: "/images/slide-3.jpg", alt: "Étudiantes en informatique et robotique" },
  { src: "/images/slide-4.jpg", alt: "Mathématiques appliquées" },
];

const interestOptions = ["Python", "Data science", "Machine learning", "Deep learning", "Mathématiques", "Opportunités"];

const initialForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  organization: "",
  profileType: "",
  educationLevel: "",
  interests: "",
  motivation: "",
  participationMode: "",
  consent: false,
};

type FormState = typeof initialForm;

const axes = [
  { number: "01", icon: Code2, title: "Bases de Python", text: "Apprendre les fondamentaux pour construire de vraies bases avant d’aller vers l’IA." },
  { number: "02", icon: BarChart3, title: "Data science", text: "Collecter, nettoyer, analyser et visualiser des données avec des outils accessibles." },
  { number: "03", icon: BrainCircuit, title: "Machine learning", text: "Comprendre les modèles et les entraîner pour répondre à des problèmes concrets." },
  { number: "04", icon: Network, title: "Deep learning", text: "Explorer les réseaux de neurones qui alimentent les applications modernes de l’IA." },
  { number: "05", icon: Atom, title: "Défis scientifiques", text: "Raisonner sur des problèmes inspirés du transport, de l’agriculture et de l’économie." },
  { number: "06", icon: GraduationCap, title: "Bourses & opportunités", text: "Partager les formations, concours, stages et programmes utiles aux jeunes talents." },
];

const fieldClass = "mt-2 h-12 w-full rounded-xl border border-[#d9d6cf] bg-white px-4 text-[0.95rem] text-[#17231f] outline-none transition focus:border-[#eb6a3d] focus:ring-4 focus:ring-[#eb6a3d]/10";

export default function Home() {
  useSeo({ title: "CMAI+Africa — Mathématiques, informatique et intelligence artificielle", description: "CMAI+Africa : une communauté africaine pour apprendre, expérimenter et innover en mathématiques, data science et intelligence artificielle.", path: "/decouvrir" });
  const [form, setForm] = useState<FormState>(initialForm);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [heroSlide, setHeroSlide] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setHeroSlide(current => (current + 1) % heroPhotos.length), 4800); return () => window.clearInterval(timer); }, []);
  const memberCount = trpc.members.count.useQuery();
  const utils = trpc.useUtils();
  const register = trpc.members.register.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setForm(initialForm);
      utils.members.count.invalidate();
      toast.success("Bienvenue dans la communauté CMAI+Africa.");
    },
    onError: error => toast.error(error.message),
  });

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const toggleInterest = (interest: string) => {
    const current = form.interests ? form.interests.split(", ").filter(Boolean) : [];
    const next = current.includes(interest) ? current.filter(item => item !== interest) : [...current, interest];
    update("interests", next.join(", "));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(false);
    register.mutate({ ...form, consent: true as const });
  };

  return (
    <div className="min-h-screen bg-[#f8f7f3] text-[#17231f] selection:bg-[#f6b84a]/40">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-[#e8e4da]/80 bg-[#f8f7f3]/90 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between">
          <a href="#top" className="flex items-center gap-3" aria-label="CMAI+Africa, accueil">
            <img src={logo} alt="Logo CMAI+Africa" className="h-10 w-10 rounded-[13px] object-cover shadow-[0_8px_20px_rgba(25,63,54,0.18)]" />
            <span className="leading-none">
              <span className="block font-display text-[1.02rem] font-semibold tracking-[-0.03em]">CMAI<span className="text-[#eb6a3d]">+</span>AFRICA</span>
              <span className="mt-1 block text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-[#718078]">Learn · Experiment · Innovate</span>
            </span>
          </a>
          <nav className="hidden items-center gap-8 md:flex" aria-label="Navigation principale">
            <a href="#vision" className="nav-link">Notre vision</a>
            <a href="#axes" className="nav-link">Nos axes</a>
            <a href="#communaute" className="nav-link">La communauté</a>
            <a href="/access" className="nav-link">Se connecter</a>
            <a href="#inscription" className="rounded-full bg-[#eb6a3d] px-5 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#d9572c]">Nous rejoindre <ArrowRight className="ml-1 inline h-4 w-4" /></a>
          </nav>
          <button className="rounded-xl p-2 md:hidden" onClick={() => setMobileOpen(current => !current)} aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={mobileOpen}>
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {mobileOpen && <nav className="border-t border-[#e8e4da] bg-[#f8f7f3] px-6 py-5 md:hidden"><div className="flex flex-col gap-4"><a onClick={() => setMobileOpen(false)} href="#vision" className="nav-link">Notre vision</a><a onClick={() => setMobileOpen(false)} href="#axes" className="nav-link">Nos axes</a><a onClick={() => setMobileOpen(false)} href="#communaute" className="nav-link">La communauté</a><a href="/access" className="nav-link">Se connecter / Créer un compte</a><a onClick={() => setMobileOpen(false)} href="#inscription" className="rounded-full bg-[#eb6a3d] px-5 py-3 text-center text-sm font-semibold text-white">Nous rejoindre</a></div></nav>}
      </header>

      <main id="top">
        <section className="relative overflow-hidden pt-[76px]">
          <div className="absolute inset-0 grid-pattern opacity-70" />
          <div className="absolute -left-40 top-20 h-[460px] w-[460px] rounded-full bg-[#f6c65a]/25 blur-3xl" />
          <div className="absolute -right-32 top-8 h-[400px] w-[400px] rounded-full bg-[#e7a995]/25 blur-3xl" />
          <div className="container relative grid min-h-[650px] items-center gap-14 py-20 lg:grid-cols-[1.08fr_0.92fr] lg:py-28">
            <div className="max-w-2xl">
              <div className="eyebrow"><span className="h-2 w-2 rounded-full bg-[#eb6a3d]" /> Club of Mathematics & Artificial Intelligence</div>
              <h1 className="mt-7 max-w-[760px] font-display text-[clamp(3.5rem,8vw,7.6rem)] font-semibold leading-[0.91] tracking-[-0.075em] text-[#193f36]">Les sciences<br /><span className="text-[#eb6a3d]">pour changer</span><br />le réel.</h1>
              <p className="mt-8 max-w-xl text-lg leading-8 text-[#596961]">CMAI+Africa rassemble celles et ceux qui veulent comprendre les mathématiques, construire avec l’informatique et innover avec l’intelligence artificielle.</p>
              <div className="mt-10 flex flex-wrap items-center gap-4"><a href="#inscription" className="group rounded-full bg-[#193f36] px-6 py-4 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(25,63,54,0.18)] transition hover:-translate-y-1">Rejoindre la communauté <ArrowRight className="ml-2 inline h-4 w-4 transition group-hover:translate-x-1" /></a><a href="#vision" className="rounded-full border border-[#c7cec7] px-6 py-4 text-sm font-semibold text-[#193f36] transition hover:border-[#193f36]">Découvrir notre vision</a></div>
              <div className="mt-12 flex items-center gap-6 text-sm text-[#718078]"><div className="flex -space-x-2"><span className="avatar-dot bg-[#193f36]">M</span><span className="avatar-dot bg-[#eb6a3d]">A</span><span className="avatar-dot bg-[#f6b84a]">+</span></div><span>Une communauté africaine en construction<br /><strong className="font-semibold text-[#193f36]">{memberCount.data ?? "…"} membre{memberCount.data === 1 ? "" : "s"} déjà inscrit{memberCount.data === 1 ? "" : "s"}</strong></span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[500px] lg:justify-self-end">
              <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
              <div className="hero-visual relative aspect-square overflow-hidden rounded-[42%_58%_52%_48%/45%_42%_58%_55%] bg-[#193f36] shadow-[0_35px_80px_rgba(25,63,54,0.2)]">
                <div className="absolute inset-0">{heroPhotos.map((photo, index) => <img key={photo.src} src={photo.src} alt={photo.alt} loading={index === 0 ? "eager" : "lazy"} decoding="async" className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${index === heroSlide ? "opacity-100" : "opacity-0"}`} />)}</div>
                <div className="absolute inset-0 bg-gradient-to-t from-[#193f36]/90 via-[#193f36]/10 to-transparent" />
                <div className="absolute inset-x-8 top-8 flex items-start justify-between"><span className="rounded-full border border-white/25 bg-[#193f36]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#f7e7cf] backdrop-blur-sm">Science · Africa · Future</span><Sparkles className="h-8 w-8 text-[#f6c65a]" /></div><div className="absolute inset-x-8 bottom-8 flex gap-2">{heroPhotos.map((photo, index) => <button key={photo.src} onClick={() => setHeroSlide(index)} aria-label={`Afficher ${photo.alt}`} className={`h-1.5 rounded-full transition-all ${index === heroSlide ? "w-10 bg-[#f6c65a]" : "w-5 bg-white/50"}`} />)}</div>
              </div>
              <div className="absolute -bottom-5 -left-7 rounded-2xl border border-[#e8e4da] bg-white px-5 py-4 shadow-[0_15px_35px_rgba(25,63,54,0.12)]"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff2dd] text-[#eb6a3d]"><Globe2 className="h-5 w-5" /></span><span className="text-xs font-semibold leading-4 text-[#193f36]">Une ambition<br />africaine</span></div></div>
            </div>
          </div>
        </section>

        <section id="vision" className="border-y border-[#e8e4da] bg-white py-24 lg:py-32">
          <div className="container grid gap-12 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24"><div><div className="section-kicker">01 / Notre vision</div><h2 className="mt-5 font-display text-5xl font-semibold leading-[0.97] tracking-[-0.06em] text-[#193f36] lg:text-6xl">La science<br /><span className="text-[#eb6a3d]">n’est pas</span><br />hors-sol.</h2></div><div className="max-w-2xl lg:pt-12"><p className="text-2xl leading-[1.35] tracking-[-0.025em] text-[#193f36]">Les mathématiques et l’informatique ne se limitent pas aux cours et aux examens. Elles donnent des clés pour <em className="font-display not-italic text-[#eb6a3d]">comprendre les problèmes réels</em> et construire des solutions qui comptent.</p><p className="mt-8 max-w-xl text-base leading-7 text-[#718078]">CMAI+Africa est un projet de communauté scientifique qui souhaite rapprocher les jeunes des sciences, créer des espaces d’échange et faire grandir une nouvelle génération de talents africains en mathématiques, IA, informatique, recherche et innovation.</p><div className="mt-10 flex flex-wrap gap-3"><span className="pill">Raisonner</span><span className="pill">Discuter</span><span className="pill">Partager</span><span className="pill">Innover</span></div></div></div>
        </section>

        <section id="axes" className="bg-[#193f36] py-24 text-white lg:py-32"><div className="container"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><div className="section-kicker section-kicker-light">02 / Nos axes</div><h2 className="mt-5 max-w-2xl font-display text-5xl font-semibold leading-[0.95] tracking-[-0.06em] lg:text-7xl">Un chemin pour<br /><span className="text-[#f6c65a]">chaque curiosité.</span></h2></div><p className="max-w-sm text-base leading-7 text-[#b8cbc0]">Du premier script Python à la recherche appliquée, chacun avance à son rythme et contribue à une communauté qui apprend ensemble.</p></div><div className="mt-16 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">{axes.map(({ number, icon: Icon, title, text }) => <article key={number} className="group bg-[#193f36] p-7 transition hover:bg-[#245448] lg:p-8"><div className="flex items-start justify-between"><span className="font-mono text-xs text-[#f6c65a]">{number}</span><Icon className="h-6 w-6 text-[#f6c65a] transition group-hover:scale-110" /></div><h3 className="mt-14 font-display text-2xl font-medium tracking-[-0.04em]">{title}</h3><p className="mt-3 text-sm leading-6 text-[#b8cbc0]">{text}</p></article>)}</div></div></section>

        <section className="bg-[#f1ede5] py-20 lg:py-28"><div className="container grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]"><div><div className="section-kicker">Maths · Data · IA · Innovation</div><h2 className="mt-5 max-w-xl font-display text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-[#193f36] lg:text-6xl">Quatre domaines,<br /><span className="text-[#eb6a3d]">une même énergie.</span></h2><p className="mt-6 max-w-md leading-7 text-[#718078]">Des bases solides, des projets concrets et une communauté africaine qui transforme la curiosité en impact.</p></div><div className="group relative overflow-hidden rounded-[2rem] shadow-[0_24px_60px_rgba(25,63,54,0.15)]"><img src="/images/domains.jpg" alt="Mathématiques, data science, intelligence artificielle et innovation africaine" className="h-full min-h-[280px] w-full object-cover transition duration-500 group-hover:scale-[1.03]" /><div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#193f36]/35 to-transparent" /></div></div></section>
        <section id="communaute" className="overflow-hidden bg-[#f6c65a] py-20"><div className="container grid items-center gap-10 lg:grid-cols-[1fr_auto_1fr]"><div><div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#193f36]"><FlaskConical className="h-5 w-5" /> Une communauté active</div><h2 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-none tracking-[-0.06em] text-[#193f36] lg:text-6xl">Des idées qui circulent.</h2></div><div className="hidden h-28 w-px bg-[#193f36]/20 lg:block" /><div className="max-w-md text-base leading-7 text-[#193f36]/75"><p>Actualités scientifiques, défis mathématiques, opportunités et conversations utiles : nous partageons ce qui aide les jeunes à passer de la curiosité à l’action.</p><a href="#inscription" className="mt-6 inline-flex items-center font-semibold text-[#193f36] underline decoration-[#eb6a3d] decoration-2 underline-offset-4">Recevoir les prochaines nouvelles <ArrowRight className="ml-2 h-4 w-4" /></a></div></div></section>

        <section id="inscription" className="relative py-24 lg:py-32"><div className="container grid gap-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24"><div className="lg:sticky lg:top-32 lg:self-start"><div className="section-kicker">03 / Nous rejoindre</div><h2 className="mt-5 font-display text-5xl font-semibold leading-[0.95] tracking-[-0.06em] text-[#193f36] lg:text-6xl">Votre place<br />est <span className="text-[#eb6a3d]">ici.</span></h2><p className="mt-7 max-w-sm leading-7 text-[#718078]">Inscrivez-vous gratuitement pour recevoir des défis, des ressources, des opportunités et participer à la construction de CMAI+Africa.</p><div className="mt-9 space-y-4 text-sm text-[#596961]"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4f0e8] text-[#193f36]"><Check className="h-4 w-4" /></span>Accès aux futures activités</div><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4f0e8] text-[#193f36]"><Check className="h-4 w-4" /></span>Opportunités sélectionnées</div><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e4f0e8] text-[#193f36]"><Check className="h-4 w-4" /></span>Une communauté qui vous ressemble</div></div></div><div className="rounded-[28px] border border-[#e2dfd5] bg-white p-6 shadow-[0_24px_70px_rgba(25,63,54,0.08)] sm:p-9">{submitted ? <div className="flex min-h-[520px] flex-col items-center justify-center text-center"><span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#e4f0e8] text-[#193f36]"><Check className="h-8 w-8" /></span><h3 className="mt-7 font-display text-4xl font-semibold tracking-[-0.05em] text-[#193f36]">Bienvenue parmi nous.</h3><p className="mt-4 max-w-md leading-7 text-[#718078]">Votre inscription a bien été enregistrée. CMAI+Africa grandit avec vous. Gardez un œil sur votre boîte e-mail pour les prochaines nouvelles.</p><button onClick={() => setSubmitted(false)} className="mt-8 text-sm font-semibold text-[#eb6a3d] underline underline-offset-4">Inscrire une autre personne</button></div> : <form onSubmit={handleSubmit}><div className="mb-9 flex items-start justify-between gap-5"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#eb6a3d]">Formulaire d’adhésion</p><h3 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em] text-[#193f36]">Faisons connaissance.</h3></div><span className="hidden rounded-full bg-[#f8f7f3] px-3 py-2 text-xs text-[#718078] sm:block">Gratuit · 3 min</span></div><div className="grid gap-5 sm:grid-cols-2"><label className="form-label">Prénom *<input required value={form.firstName} onChange={e => update("firstName", e.target.value)} className={fieldClass} placeholder="Amina" /></label><label className="form-label">Nom *<input required value={form.lastName} onChange={e => update("lastName", e.target.value)} className={fieldClass} placeholder="Diallo" /></label><label className="form-label sm:col-span-2">Adresse e-mail *<input required type="email" value={form.email} onChange={e => update("email", e.target.value)} className={fieldClass} placeholder="vous@exemple.com" /></label><label className="form-label">Pays *<input required value={form.country} onChange={e => update("country", e.target.value)} className={fieldClass} placeholder="Sénégal" /></label><label className="form-label">Ville<input value={form.city} onChange={e => update("city", e.target.value)} className={fieldClass} placeholder="Dakar" /></label><label className="form-label">Téléphone<input value={form.phone} onChange={e => update("phone", e.target.value)} className={fieldClass} placeholder="Optionnel" /></label><label className="form-label">Organisation / école<input value={form.organization} onChange={e => update("organization", e.target.value)} className={fieldClass} placeholder="Optionnel" /></label><label className="form-label sm:col-span-2">Vous êtes *<select required value={form.profileType} onChange={e => update("profileType", e.target.value)} className={fieldClass}><option value="">Sélectionner…</option><option>Étudiant(e)</option><option>Enseignant(e) / chercheur(se)</option><option>Professionnel(le)</option><option>Passionné(e) autodidacte</option><option>Organisation / partenaire</option></select></label><label className="form-label sm:col-span-2">Niveau d’études<select value={form.educationLevel} onChange={e => update("educationLevel", e.target.value)} className={fieldClass}><option value="">Sélectionner…</option><option>Collège / lycée</option><option>Prépa 1</option><option>Prépa 2</option><option>Bac +1</option><option>Bac +2</option><option>Licence / Bachelor</option><option>Master</option><option>Doctorat</option><option>Autre</option></select></label></div><fieldset className="mt-6"><legend className="form-label">Domaines qui vous intéressent * <span className="font-normal normal-case tracking-normal text-[#9aa49d]">(plusieurs choix)</span></legend><div className="mt-3 flex flex-wrap gap-2">{interestOptions.map(interest => { const selected = form.interests.split(", ").includes(interest); return <button type="button" key={interest} onClick={() => toggleInterest(interest)} className={`rounded-full border px-3.5 py-2 text-sm transition ${selected ? "border-[#193f36] bg-[#193f36] text-white" : "border-[#d9d6cf] bg-white text-[#596961] hover:border-[#193f36]"}`}>{selected && <Check className="mr-1 inline h-3.5 w-3.5" />}{interest}</button>; })}</div></fieldset><label className="form-label mt-6">Ce que vous aimeriez apprendre ou construire<textarea value={form.motivation} onChange={e => update("motivation", e.target.value)} className={`${fieldClass} min-h-28 resize-y py-3`} placeholder="Parlez-nous de votre curiosité…" /></label><fieldset className="mt-6"><legend className="form-label">Comment souhaitez-vous participer ? *</legend><div className="mt-3 grid gap-2 sm:grid-cols-3">{["Apprendre", "Partager", "Les deux"].map(mode => <label key={mode} className={`cursor-pointer rounded-xl border p-3 text-center text-sm transition ${form.participationMode === mode ? "border-[#193f36] bg-[#edf4ee] font-semibold text-[#193f36]" : "border-[#d9d6cf] text-[#596961] hover:border-[#193f36]"}`}><input required type="radio" name="participationMode" value={mode} checked={form.participationMode === mode} onChange={e => update("participationMode", e.target.value)} className="sr-only" />{mode}</label>)}</div></fieldset><label className="mt-6 flex cursor-pointer items-start gap-3 text-xs leading-5 text-[#718078]"><input required type="checkbox" checked={form.consent} onChange={e => update("consent", e.target.checked)} className="mt-1 h-4 w-4 accent-[#eb6a3d]" />J’accepte que CMAI+Africa conserve ces informations pour gérer mon adhésion et me contacter au sujet de ses activités.</label><Button type="submit" disabled={register.isPending || !form.interests} className="mt-8 h-13 w-full rounded-xl bg-[#eb6a3d] text-base font-semibold text-white hover:bg-[#d9572c] disabled:cursor-not-allowed disabled:opacity-50">{register.isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Inscription en cours…</> : <>Rejoindre CMAI+Africa <ArrowRight className="ml-2 h-5 w-5" /></>}</Button><p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-[#9aa49d]"><Mail className="h-3.5 w-3.5" />Vos informations restent confidentielles.</p></form>}</div></div></section>
      </main>

      <footer className="border-t border-[#dfe0d8] bg-[#f0eee8] py-10"><div className="container flex flex-col gap-7 md:flex-row md:items-end md:justify-between"><div><a href="#top" className="font-display text-lg font-semibold tracking-[-0.04em] text-[#193f36]">CMAI<span className="text-[#eb6a3d]">+</span>AFRICA</a><p className="mt-2 max-w-sm text-sm leading-6 text-[#718078]">Les mathématiques pour comprendre. L’informatique pour construire. L’IA pour innover.</p></div><div className="flex items-center gap-6 text-sm text-[#718078]"><a href="#vision" className="hover:text-[#193f36]">Vision</a><a href="#axes" className="hover:text-[#193f36]">Axes</a><a href="#inscription" className="hover:text-[#193f36]">Inscription</a><a href="/access" className="hover:text-[#193f36]">Espace membre</a></div></div><div className="container mt-8 flex flex-col gap-2 border-t border-[#dfe0d8] pt-5 text-xs text-[#9aa49d] sm:flex-row sm:justify-between"><span>© 2026 CMAI+Africa. Une communauté en construction.</span><span>Fait avec curiosité en Afrique.</span></div></footer>
    </div>
  );
}
