import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import { storagePath } from "./storage";
import { ENV } from "./env";

const from = process.env.SMTP_FROM || "cmai.africa2026@gmail.com";
const transporter = process.env.SMTP_PASS
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT || 465),
      secure: String(process.env.SMTP_SECURE || "true") === "true",
      auth: { user: process.env.SMTP_USER || from, pass: process.env.SMTP_PASS },
    })
  : null;

export const emailConfigured = () => Boolean(transporter);
export const emailSender = () => from;

export const esc = (value: unknown) =>
  String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MailAttachment = { filename: string; content?: Buffer; path?: string; contentType?: string };

/** Envoie un e-mail. Ne lève jamais d'exception : retourne false en cas d'échec. */
export async function sendEmail(to: string, subject: string, html: string, attachments?: MailAttachment[]) {
  if (!transporter) {
    console.warn(`[Mailer] SMTP_PASS manquant : e-mail non envoyé à ${to} (${subject})`);
    return false;
  }
  try {
    await transporter.sendMail({ from: `CMAI+Africa <${from}>`, to, subject, html, attachments });
    return true;
  } catch (error) {
    console.error(`[Mailer] Échec de l'envoi à ${to} :`, error instanceof Error ? error.message : error);
    return false;
  }
}

/** Charge un fichier du stockage comme pièce jointe réelle. */
export async function attachmentFromKey(key: string, filename?: string): Promise<MailAttachment | undefined> {
  try {
    const content = await readFile(storagePath(key));
    return { filename: filename || key.split("/").pop() || "piece-jointe", content };
  } catch (error) {
    console.warn("[Mailer] Pièce jointe introuvable :", key, error);
    return undefined;
  }
}

const shell = (title: string, body: string) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#14213d;max-width:560px;margin:auto"><h1 style="font-size:22px;margin:0 0 12px">${title}</h1>${body}<p style="margin-top:24px;color:#5b6b82;font-size:13px">L'équipe CMAI+Africa${ENV.baseUrl ? ` · <a href="${ENV.baseUrl}" style="color:#2f6fed">${ENV.baseUrl.replace(/^https?:\/\//, "")}</a>` : ""}</p></div>`;

export const sendVerificationEmail = (to: string, name: string, code: string) =>
  sendEmail(to, "Votre code de vérification CMAI+Africa", shell("Confirmez votre adresse e-mail",
    `<p>Bonjour ${esc(name)},</p><p>Votre code est :</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:12px 0">${esc(code)}</p><p>Il est valable 15 minutes. Pensez à vérifier vos courriers indésirables (spam).</p>`));

export const sendResetEmail = (to: string, code: string) =>
  sendEmail(to, "Réinitialisation de votre mot de passe CMAI+Africa", shell("Mot de passe oublié",
    `<p>Votre code de réinitialisation est :</p><p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:12px 0">${esc(code)}</p><p>Il est valable 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`));

export const sendWelcomeEmail = (to: string, name: string) =>
  sendEmail(to, "Bienvenue dans la communauté CMAI+Africa", shell(`Bienvenue ${esc(name)}.`,
    `<p>Votre inscription à CMAI+Africa est confirmée. Vous pouvez découvrir les cours, les défis scientifiques, les actualités universitaires et les opportunités de la communauté.</p>`));

export const sendStudentReceivedEmail = (to: string, name: string) =>
  sendEmail(to, "Votre demande étudiant a été reçue", shell("Dossier reçu",
    `<p>Bonjour ${esc(name)}, votre demande d'accès gratuit aux cours a bien été transmise. Notre équipe vérifie vos justificatifs et vous répondra dès que la décision sera prise.</p>`));

export const sendStudentDecisionEmail = (to: string, name: string, approved: boolean) =>
  sendEmail(to, approved ? "Votre accès étudiant CMAI+Africa est approuvé" : "Mise à jour de votre demande étudiant", shell(approved ? "Accès approuvé" : "Demande mise à jour",
    `<p>Bonjour ${esc(name)},</p><p>${approved ? "Votre demande est approuvée : vous bénéficiez de l'accès gratuit à tous les cours payants de CMAI+Africa." : "Après examen, votre demande n'a pas été approuvée pour le moment. Vous pouvez contacter l'équipe pour obtenir des précisions."}</p>`));

export async function sendReceiptEmail(input: { to: string; name: string; course: string; amount: string; method: string; phone: string; reference: string; pdf?: Buffer; number: string }) {
  const rows: [string, string][] = [["Nom et prénom", input.name], ["Adresse e-mail", input.to], ["Téléphone", input.phone], ["Cours", input.course], ["Montant", input.amount], ["Moyen de paiement", input.method.toUpperCase()], ["Référence", input.reference]];
  const table = rows.map(([label, value]) => `<tr><td style="padding:6px 18px 6px 0"><strong>${esc(label)}</strong></td><td>${esc(value)}</td></tr>`).join("");
  return sendEmail(input.to, `Quittance de paiement ${input.number} — CMAI+Africa`, shell("Quittance de paiement",
    `<p>Bonjour ${esc(input.name)}, votre paiement est confirmé. Votre quittance PDF est jointe à ce message.</p><table style="border-collapse:collapse">${table}</table><p>Conservez ce document comme justificatif.</p>`),
    input.pdf ? [{ filename: `quittance-${input.number}.pdf`, content: input.pdf, contentType: "application/pdf" }] : undefined);
}

export async function sendCertificateEmail(to: string, name: string, course: string, attachment?: MailAttachment) {
  return sendEmail(to, "Votre certificat CMAI+Africa", shell("Certificat disponible",
    `<p>Bonjour ${esc(name)}, votre certificat pour le cours « ${esc(course)} » a été préparé par CMAI+Africa.${attachment ? " Il est joint à ce message." : " L'équipe vous le transmettra par retour d'e-mail."}</p>`),
    attachment ? [attachment] : undefined);
}

export const sendAdminMessage = (to: string, subject: string, message: string, attachments?: MailAttachment[]) =>
  sendEmail(to, subject, `<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.6;color:#14213d;white-space:pre-wrap">${esc(message)}</div>`, attachments);
