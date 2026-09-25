import { useAuth } from "@/_core/hooks/useAuth";
import { BrandMark } from "@/components/Logo";
import { trpc } from "@/lib/trpc";
import { useSeo } from "@/lib/seo";
import { COUNTRIES, EDUCATION_LEVELS, GENDERS, PROFESSIONS, isStudentProfession } from "@shared/options";
import { UNIVERSITIES } from "@shared/universities";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { FormEvent, ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type Mode = "login" | "register" | "verify" | "forgot" | "reset";

const emptyForm = {
  firstName: "", lastName: "", email: "", gender: "", country: "Bénin", city: "", phone: "", profession: "", educationLevel: "", university: "", address: "",
  password: "", confirm: "", code: "",
};

function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="form-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-[#64748b]">{hint}</span>}
    </label>
  );
}

export default function Access() {
  useSeo({ title: "Connexion et inscription", description: "Connectez-vous ou créez votre compte CMAI+Africa pour suivre les cours, participer aux défis et rejoindre la communauté.", path: "/access" });
  const { user, loading } = useAuth();
  const utils = trpc.useUtils();
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState(emptyForm);
  const [showPassword, setShowPassword] = useState(false);
  const set = (key: keyof typeof emptyForm, value: string) => setForm(current => ({ ...current, [key]: value }));
  const isStudent = isStudentProfession(form.profession);

  useEffect(() => {
    if (!loading && user) navigate("/home");
  }, [loading, user, navigate]);

  const enter = async () => {
    await utils.auth.me.invalidate();
    navigate("/home");
  };

  const login = trpc.auth.login.useMutation({
    onSuccess: enter,
    onError: error => {
      toast.error(error.message);
      if (error.message.includes("non vérifié")) setMode("verify");
    },
  });
  const register = trpc.auth.register.useMutation({
    onSuccess: data => {
      setMode("verify");
      set("code", "");
      toast.success(data.emailSent ? "Compte créé. Un code de vérification vient d'être envoyé à votre e-mail." : "Compte créé, mais l'e-mail n'a pas pu partir : utilisez « Renvoyer le code ».");
    },
    onError: error => toast.error(error.message),
  });
  const resend = trpc.auth.resendCode.useMutation({ onSuccess: () => toast.success("Nouveau code envoyé (vérifiez aussi vos courriers indésirables)."), onError: error => toast.error(error.message) });
  const verify = trpc.auth.verifyEmail.useMutation({ onSuccess: () => { toast.success("Adresse vérifiée, bienvenue !"); void enter(); }, onError: error => toast.error(error.message) });
  const requestReset = trpc.auth.requestReset.useMutation({ onSuccess: () => { setMode("reset"); set("code", ""); toast.success("Si un compte existe pour cet e-mail, un code vient d'être envoyé."); }, onError: error => toast.error(error.message) });
  const reset = trpc.auth.resetPassword.useMutation({ onSuccess: () => { toast.success("Mot de passe modifié : vous êtes connecté."); void enter(); }, onError: error => toast.error(error.message) });

  const busy = login.isPending || register.isPending || verify.isPending || requestReset.isPending || reset.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const email = form.email.trim().toLowerCase();
    if (mode === "login") return login.mutate({ email, password: form.password });
    if (mode === "verify") return verify.mutate({ email, code: form.code.trim() });
    if (mode === "forgot") return requestReset.mutate({ email });
    if (form.password !== form.confirm) return void toast.error("Les deux mots de passe ne sont pas identiques.");
    if (mode === "reset") return reset.mutate({ email, code: form.code.trim(), password: form.password });
    if (!form.gender || !form.profession) return void toast.error("Renseignez votre sexe et votre statut.");
    register.mutate({
      firstName: form.firstName, lastName: form.lastName, email, gender: form.gender as (typeof GENDERS)[number], country: form.country, city: form.city, phone: form.phone,
      profession: form.profession, educationLevel: form.educationLevel, university: form.university, address: form.address, password: form.password,
    });
  };

  const titles: Record<Mode, [string, string]> = {
    login: ["Connexion", "Accédez à votre espace membre."],
    register: ["Créer un compte", "Toutes les informations marquées d'un * sont obligatoires."],
    verify: ["Vérifiez votre e-mail", "Saisissez le code à 6 chiffres reçu par e-mail (valable 15 minutes)."],
    forgot: ["Mot de passe oublié", "Nous vous envoyons un code de réinitialisation par e-mail."],
    reset: ["Nouveau mot de passe", "Saisissez le code reçu puis choisissez votre nouveau mot de passe."],
  };

  const passwordInput = (id: string, autoComplete: string, placeholder?: string) => (
    <div className="relative">
      <input id={id} className="form-input pr-12" type={showPassword ? "text" : "password"} autoComplete={autoComplete} minLength={mode === "login" ? 1 : 8} required placeholder={placeholder} value={id === "confirm" ? form.confirm : form.password} onChange={event => set(id === "confirm" ? "confirm" : "password", event.target.value)} />
      <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-[1.35rem] text-[#64748b]" aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
      </button>
    </div>
  );

  return (
    <div className="grid min-h-screen bg-[#f8fafc] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-[#0f172a] lg:block">
        <img src="/images/slide-1.jpg" alt="" className="access-visual absolute inset-0 h-full w-full object-cover opacity-40" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/70 to-transparent" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <span className="font-display text-lg font-semibold">CMAI<span className="text-[#f59e0b]">+</span>AFRICA</span>
          <div>
            <h2 className="font-display text-5xl font-semibold leading-[0.98] tracking-[-0.06em]">Les sciences pour changer le réel.</h2>
            <p className="mt-5 max-w-md leading-7 text-slate-300">Cours, défis scientifiques, opportunités et une communauté africaine qui apprend ensemble.</p>
          </div>
        </div>
      </aside>

      <main className="flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-xl">
          <div className="mb-8 flex items-center justify-between">
            <BrandMark />
            <Link href="/decouvrir" className="text-sm font-semibold text-[#0f172a] hover:underline">Découvrir le club</Link>
          </div>
          <h1 className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#0f172a]">{titles[mode][0]}</h1>
          <p className="mt-2 text-sm leading-6 text-[#475569]">{titles[mode][1]}</p>

          <form onSubmit={submit} className="mt-7 space-y-4" noValidate={false}>
            {mode === "register" && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Prénom *"><input className="form-input" required minLength={2} autoComplete="given-name" value={form.firstName} onChange={event => set("firstName", event.target.value)} /></Field>
                  <Field label="Nom *"><input className="form-input" required minLength={2} autoComplete="family-name" value={form.lastName} onChange={event => set("lastName", event.target.value)} /></Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Sexe *">
                    <select className="form-input" required value={form.gender} onChange={event => set("gender", event.target.value)}>
                      <option value="">Choisir…</option>
                      {GENDERS.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Pays *">
                    <select className="form-input" required value={form.country} onChange={event => set("country", event.target.value)}>
                      {COUNTRIES.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Ville *"><input className="form-input" required minLength={2} autoComplete="address-level2" value={form.city} onChange={event => set("city", event.target.value)} /></Field>
                  <Field label="Numéro de téléphone *"><input className="form-input" required type="tel" inputMode="tel" autoComplete="tel" placeholder="+229 01 XX XX XX XX" minLength={8} value={form.phone} onChange={event => set("phone", event.target.value)} /></Field>
                </div>
                <Field label="Profession ou statut *">
                  <select className="form-input" required value={form.profession} onChange={event => set("profession", event.target.value)}>
                    <option value="">Choisir…</option>
                    {PROFESSIONS.map(item => <option key={item}>{item}</option>)}
                  </select>
                </Field>
                {isStudent && (
                  <Field label="Niveau d'études *">
                    <select className="form-input" required value={form.educationLevel} onChange={event => set("educationLevel", event.target.value)}>
                      <option value="">Choisir…</option>
                      {EDUCATION_LEVELS.map(item => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                )}
                <Field label={isStudent ? "Université ou établissement *" : "Établissement ou organisation (facultatif)"} hint="Choisissez dans la liste ou écrivez le nom de votre établissement.">
                  <input className="form-input" list="universities" required={isStudent} maxLength={240} value={form.university} onChange={event => set("university", event.target.value)} />
                  <datalist id="universities">{UNIVERSITIES.map(item => <option key={item} value={item} />)}</datalist>
                </Field>
                <Field label="Adresse (facultatif)"><input className="form-input" autoComplete="street-address" maxLength={240} value={form.address} onChange={event => set("address", event.target.value)} /></Field>
              </>
            )}

            <Field label="Adresse e-mail *"><input className="form-input" type="email" required autoComplete="email" value={form.email} onChange={event => set("email", event.target.value)} /></Field>

            {(mode === "verify" || mode === "reset") && (
              <Field label="Code à 6 chiffres *"><input className="form-input tracking-[0.5em]" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" value={form.code} onChange={event => set("code", event.target.value.replace(/\D/g, ""))} /></Field>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <Field label={mode === "reset" ? "Nouveau mot de passe *" : "Mot de passe *"} hint={mode !== "login" ? "8 caractères minimum." : undefined}>
                {passwordInput("password", mode === "login" ? "current-password" : "new-password")}
              </Field>
            )}
            {(mode === "register" || mode === "reset") && <Field label="Confirmer le mot de passe *">{passwordInput("confirm", "new-password")}</Field>}

            <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0f172a] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#1e293b] disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "login" ? "Se connecter" : mode === "register" ? "Créer mon compte" : mode === "verify" ? "Valider mon e-mail" : mode === "forgot" ? "Envoyer le code" : "Changer le mot de passe"}
            </button>
          </form>

          {mode === "verify" && (
            <button type="button" disabled={resend.isPending || !form.email} onClick={() => resend.mutate({ email: form.email.trim().toLowerCase() })} className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#d97706]">
              <MailCheck className="h-4 w-4" /> Renvoyer le code
            </button>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {mode !== "login" && <button className="font-semibold text-[#0f172a] hover:underline" onClick={() => setMode("login")}>J'ai déjà un compte</button>}
            {mode !== "register" && <button className="font-semibold text-[#0f172a] hover:underline" onClick={() => setMode("register")}>Créer un compte</button>}
            {mode === "login" && <button className="font-semibold text-[#d97706] hover:underline" onClick={() => setMode("forgot")}>Mot de passe oublié ?</button>}
          </div>
        </div>
      </main>
    </div>
  );
}