import { initTRPC, TRPCError } from "@trpc/server";
import type { Request, Response } from "express";
import superjson from "superjson";
import { ZodError } from "zod";
import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from "../shared/const";
import type { User } from "../drizzle/schema";
import { ENV } from "./env";

export type Context = { req: Request; res: Response; user: User | null };

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // Message lisible en français pour les erreurs de validation (au lieu d'un JSON technique).
    let message = shape.message;
    if (error.cause instanceof ZodError) {
      const issue = error.cause.issues[0];
      const field = issue?.path?.join(".") || "champ";
      message = `Valeur invalide pour « ${field} » : ${issue?.message ?? "format incorrect"}.`;
    } else if (error.code === "INTERNAL_SERVER_ERROR" && ENV.isProduction) {
      message = "Une erreur est survenue. Réessayez dans un instant.";
    }
    return { ...shape, message, data: { ...shape.data, stack: ENV.isProduction ? undefined : shape.data.stack } };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
  return next({ ctx });
});
