import compression from "compression";
import cookieParser from "cookie-parser";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import multer from "multer";
import { createServer } from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { assertConfig, ENV } from "./env";
import { createContext, getUserFromRequest } from "./context";
import { getCourseById, getCourseFileByKey, hasCourseAccess } from "./learning";
import { syncByProviderId } from "./payments";
import { rateLimit } from "./rateLimit";
import { appRouter } from "./routers";
import { storageExists, storagePath, storagePut } from "./storage";

assertConfig();

const IMAGES = ["image/jpeg", "image/png", "image/webp"];
const OFFICE = [
  "application/pdf", "text/plain", "text/csv", "application/zip", "application/x-zip-compressed", "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp", "pdf", "txt", "csv", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx"]);

type Kind = { mimes: string[]; maxBytes: number; adminOnly: boolean; dir: (userId: number) => string };
const MB = 1024 * 1024;
const KINDS: Record<string, Kind> = {
  student: { mimes: [...IMAGES, "application/pdf"], maxBytes: 8 * MB, adminOnly: false, dir: id => `student-applications/${id}` },
  media: { mimes: [...IMAGES, "application/pdf"], maxBytes: 8 * MB, adminOnly: false, dir: id => `media/${id}` },
  mail: { mimes: [...IMAGES, ...OFFICE], maxBytes: 20 * MB, adminOnly: true, dir: () => "admin-files" },
  post: { mimes: [...IMAGES, ...OFFICE], maxBytes: 20 * MB, adminOnly: true, dir: () => "posts" },
  course: { mimes: [...IMAGES, ...OFFICE], maxBytes: 20 * MB, adminOnly: true, dir: () => "course-files" },
};

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * MB, files: 1 } });
const fixName = (name: string) => Buffer.from(name, "latin1").toString("utf8").replace(/[^\p{L}\p{N}._ -]/gu, "-").slice(-120);

async function canReadFile(req: Request, key: string) {
  const user = await getUserFromRequest(req);
  if (!user) return false;
  if (user.role === "admin") return true;
  const [root, owner] = key.split("/");
  if (root === "student-applications" || root === "receipts") return String(user.id) === owner;
  if (root === "media" || root === "posts") return true;
  if (root === "course-files") {
    const file = await getCourseFileByKey(key);
    const course = file ? await getCourseById(file.courseId) : undefined;
    return Boolean(course && course.isPublished && (await hasCourseAccess(user, course)));
  }
  return false; // admin-files et tout le reste : réservé aux administrateurs
}

async function main() {
  const app = express();
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(compression());
  app.use(helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "script-src": ["'self'"],
        "connect-src": ["'self'"],
        "frame-ancestors": ["'none'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cookieParser());

  // Retour de la passerelle de paiement (notification serveur POST ou retour navigateur GET).
  // Le statut est toujours relu auprès de FedaPay : le contenu reçu n'est jamais cru tel quel.
  const paymentNotice = async (req: Request, res: Response) => {
    const raw = String((req.query.id as string) || (req.body && (req.body.id ?? req.body.entity?.id ?? req.body.object?.id ?? req.body.data?.id)) || "");
    if (/^\d{1,20}$/.test(raw)) await syncByProviderId(raw).catch(error => console.error("[Payments] callback :", error));
    if (req.method === "GET") return res.redirect(302, "/paiement?retour=1");
    return res.json({ received: true });
  };
  app.get("/api/payments/webhook", (req, res) => void paymentNotice(req, res));
  app.post("/api/payments/webhook", express.json({ limit: "1mb" }), (req, res) => void paymentNotice(req, res));

  app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getUserFromRequest(req);
      if (!user) return res.status(401).json({ message: "Connexion requise." });
      const kind = KINDS[String(req.body?.kind || "")];
      if (!kind) return res.status(400).json({ message: "Type de téléversement inconnu." });
      if (kind.adminOnly && user.role !== "admin") return res.status(403).json({ message: "Réservé aux administrateurs." });
      rateLimit(`upload:${user.id}`, 40, 10 * 60 * 1000);
      const file = req.file;
      if (!file) return res.status(400).json({ message: "Aucun fichier reçu." });
      const name = fixName(file.originalname);
      const ext = name.split(".").pop()?.toLowerCase() || "";
      if (!kind.mimes.includes(file.mimetype) || !EXTENSIONS.has(ext)) return res.status(400).json({ message: "Format non accepté (PDF, images, documents Office ou ZIP selon le cas)." });
      if (file.size > kind.maxBytes) return res.status(413).json({ message: `Fichier trop volumineux (maximum ${Math.round(kind.maxBytes / MB)} Mo).` });
      const stored = await storagePut(`${kind.dir(user.id)}/${Date.now()}-${name}`, file.buffer);
      return res.json({ key: stored.key, url: stored.url, name, mime: file.mimetype });
    } catch (error: any) {
      if (error?.code === "TOO_MANY_REQUESTS") return res.status(429).json({ message: error.message });
      console.error("[Upload]", error);
      return res.status(500).json({ message: "Le téléversement a échoué." });
    }
  });

  app.get("/api/files/*", async (req: Request, res: Response) => {
    try {
      const key = String(req.params[0] || "");
      if (!key || !(await canReadFile(req, key))) return res.status(403).send("Accès refusé.");
      if (!(await storageExists(key))) return res.status(404).send("Fichier introuvable.");
      const inline = /\.(png|jpe?g|webp|pdf)$/i.test(key);
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "private, max-age=3600");
      res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${path.basename(key).replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "")}"`);
      return res.sendFile(storagePath(key));
    } catch (error) {
      console.error("[Files]", error);
      return res.status(500).send("Erreur de lecture du fichier.");
    }
  });

  app.use("/api/trpc", createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ error, path: procedure }) => {
      if (error.code === "INTERNAL_SERVER_ERROR") console.error(`[tRPC] ${procedure ?? "?"} :`, error);
    },
  }));

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  const publicDir = path.resolve(process.cwd(), "dist/public");
  if (existsSync(publicDir)) {
    app.use("/assets", express.static(path.join(publicDir, "assets"), { maxAge: "1y", immutable: true }));
    app.use(express.static(publicDir, { maxAge: "1h", index: false }));
    app.get("*", (_req, res) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(publicDir, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => res.send("API CMAI+Africa en marche. Lancez « npm run build » pour générer le site."));
  }

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[Server]", error);
    res.status(500).json({ message: "Erreur interne du serveur." });
  });

  const server = createServer(app);
  server.listen(ENV.port, () => console.log(`CMAI+Africa : serveur prêt sur http://localhost:${ENV.port}`));
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
