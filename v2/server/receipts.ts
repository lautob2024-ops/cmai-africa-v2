import PDFDocument from "pdfkit";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { storagePut } from "./storage";

export type ReceiptInput = {
  paymentId: number;
  userId: number;
  name: string;
  email: string;
  phone: string;
  course: string;
  amount: string; // ex. « 12 000 XOF »
  listPrice?: string; // ex. « 20 USD »
  method: string;
  reference: string;
  paidAt: Date;
};

export const receiptNumber = (paymentId: number, date = new Date()) => `CMAI-${date.getUTCFullYear()}-${String(paymentId).padStart(5, "0")}`;

function findLogo(): Buffer | undefined {
  const candidates = [process.env.LOGO_PATH, ...["logo.jpg", "logo.jpeg", "logo.png"].map(file => path.resolve(process.cwd(), "server/assets", file))].filter(Boolean) as string[];
  for (const file of candidates) {
    try {
      if (existsSync(file)) return readFileSync(file);
    } catch {
      /* fichier illisible : on essaie le suivant */
    }
  }
  return undefined;
}

export async function buildReceiptPdf(input: ReceiptInput): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 52, info: { Title: `Quittance ${receiptNumber(input.paymentId, input.paidAt)}`, Author: "CMAI+Africa" } });
  const chunks: Buffer[] = [];
  doc.on("data", chunk => chunks.push(Buffer.from(chunk)));
  const finished = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  // En-tête : logo CMAI+Africa
  const logo = findLogo();
  let logoDrawn = false;
  if (logo) {
    try {
      doc.image(logo, 52, 42, { fit: [78, 78] });
      logoDrawn = true;
    } catch {
      logoDrawn = false;
    }
  }
  if (!logoDrawn) {
    doc.circle(90, 80, 36).fill("#14213d");
    doc.fillColor("#b9c4d6").font("Helvetica-Bold").fontSize(15).text("CMAI+", 62, 73, { width: 56, align: "center" });
  }
  doc.fillColor("#14213d").font("Helvetica-Bold").fontSize(24).text("CMAI+Africa", 146, 56);
  doc.fillColor("#2f6fed").font("Helvetica").fontSize(9).text("CLUB OF MATHEMATICS AND ARTIFICIAL INTELLIGENCE", 146, 86, { characterSpacing: 0.6 });
  doc.moveTo(52, 138).lineTo(543, 138).lineWidth(1).strokeColor("#cfd6e2").stroke();

  doc.fillColor("#14213d").font("Helvetica-Bold").fontSize(20).text("QUITTANCE DE PAIEMENT", 52, 162);
  doc.fillColor("#5b6b82").font("Helvetica").fontSize(10).text(`N° ${receiptNumber(input.paymentId, input.paidAt)}`, 52, 190);

  const when = input.paidAt.toLocaleString("fr-FR", { timeZone: "Africa/Lagos", dateStyle: "long", timeStyle: "short" });
  const rows: [string, string][] = [
    ["Nom et prénom", input.name],
    ["Adresse e-mail", input.email],
    ["Numéro de téléphone", input.phone],
    ["Cours payé", input.course],
    ["Montant payé", input.amount],
    ...(input.listPrice ? ([["Prix du cours", input.listPrice]] as [string, string][]) : []),
    ["Moyen de paiement", input.method.toUpperCase()],
    ["Référence de transaction", input.reference],
    ["Date de paiement", when],
  ];
  let y = 226;
  rows.forEach(([label, value], index) => {
    doc.roundedRect(52, y - 6, 491, 32, 5).fill(index % 2 ? "#f6f8fb" : "#ffffff");
    doc.fillColor("#14213d").font("Helvetica-Bold").fontSize(10).text(label, 68, y + 4, { width: 170 });
    doc.fillColor("#3a4658").font("Helvetica").fontSize(10.5).text(value || "—", 245, y + 4, { width: 285, ellipsis: true, height: 16 });
    y += 38;
  });

  doc.fillColor("#2e7d56").font("Helvetica-Bold").fontSize(13).text("PAIEMENT CONFIRMÉ", 52, y + 22);
  doc.fillColor("#5b6b82").font("Helvetica").fontSize(9).text("Cette quittance est générée automatiquement par CMAI+Africa après confirmation du paiement. Conservez-la comme justificatif.", 52, y + 50, { width: 491 });
  doc.end();
  return finished;
}

export async function generateReceipt(input: ReceiptInput) {
  const pdf = await buildReceiptPdf(input);
  const stored = await storagePut(`receipts/${input.userId}/${receiptNumber(input.paymentId, input.paidAt)}.pdf`, pdf);
  return { ...stored, pdf };
}
