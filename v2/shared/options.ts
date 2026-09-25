export const GENDERS = ["Femme", "Homme", "Autre", "Préfère ne pas répondre"] as const;

export const PROFESSIONS = [
  "Étudiant(e)",
  "Élève",
  "Enseignant(e) / Chercheur(se)",
  "Ingénieur(e) / Développeur(se)",
  "Salarié(e)",
  "Entrepreneur(e)",
  "En recherche d'emploi",
  "Autre",
] as const;

export const EDUCATION_LEVELS = [
  "Secondaire",
  "Baccalauréat",
  "Classes préparatoires",
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
  "Ingénieur",
  "Doctorat",
  "Autre",
] as const;

export const COUNTRIES = [
  "Bénin", "Togo", "Côte d'Ivoire", "Sénégal", "Burkina Faso", "Mali", "Niger", "Nigeria", "Ghana", "Guinée",
  "Cameroun", "Gabon", "Congo", "RD Congo", "Tchad", "République centrafricaine", "Mauritanie", "Maroc", "Algérie",
  "Tunisie", "Égypte", "Kenya", "Éthiopie", "Tanzanie", "Ouganda", "Rwanda", "Burundi", "Madagascar", "Maurice",
  "Afrique du Sud", "Sierra Leone", "Liberia", "Gambie", "Guinée-Bissau", "Cap-Vert", "Angola", "Mozambique",
  "Zambie", "Zimbabwe", "Namibie", "Botswana", "Djibouti", "Comores", "France", "Belgique", "Canada", "Autre",
] as const;

export const isStudentProfession = (profession: string) => /^(étudiant|élève)/i.test(profession.trim());
