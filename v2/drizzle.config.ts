import { defineConfig } from "drizzle-kit";
import "dotenv/config";

const url = new URL(process.env.DATABASE_URL ?? "mysql://localhost:3306/placeholder");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "mysql",
  dbCredentials: {
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "test",
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: false },
  },
});
