import "dotenv/config";

const isProduction = process.env.NODE_ENV === "production";

export const ENV = {
  isProduction,
  port: Number(process.env.PORT || 3000),
  baseUrl: (process.env.PUBLIC_BASE_URL || "").replace(/\/+$/, ""),
  jwtSecret: process.env.JWT_SECRET || "",
  databaseUrl: process.env.DATABASE_URL || "",
  adminEmails: (process.env.ADMIN_EMAILS || "").split(",").map(item => item.trim().toLowerCase()).filter(Boolean),
  uploadDir: process.env.UPLOAD_DIR || "./storage",
  usdToXof: Number(process.env.USD_TO_XOF || 600),
};

/** Refuse de démarrer en production avec une configuration dangereuse. */
export function assertConfig() {
  if (isProduction && ENV.jwtSecret.length < 32) {
    throw new Error("JWT_SECRET (32 caractères minimum) est obligatoire en production.");
  }
  if (!ENV.databaseUrl) console.warn("[Config] DATABASE_URL manquant : aucune donnée ne pourra être lue ni enregistrée.");
  if (!ENV.jwtSecret) console.warn("[Config] JWT_SECRET manquant : un secret de développement temporaire est utilisé.");
}
