import { z } from "zod";

export const matchFormatoSchema = z.enum(["f5", "f7", "f9", "f11"]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Coincide con usuarios_username_format_chk: ^[a-z0-9_]{3,20}$ */
export const usernameSchema = z.string().transform(normalizeUsername).superRefine((v, ctx) => {
  if (v.length < 3) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mínimo 3 caracteres" });
    return;
  }
  if (v.length > 20) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Máximo 20 caracteres" });
    return;
  }
  if (!/^[a-z0-9_]+$/.test(v)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Solo minúsculas, números y guion bajo",
    });
  }
});

export const crearEquipoSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto").max(60, "Nombre demasiado largo"),
  escudo_url: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  formato_habitual: matchFormatoSchema,
  provincia_id: z.string().uuid().nullable().optional(),
  partido_id: z.string().uuid().nullable().optional(),
  localidad_id: z.string().uuid().nullable().optional(),
});

export const invitarJugadorSchema = z.object({
  equipo_id: z.string().uuid(),
  identificador: z
    .string()
    .trim()
    .min(3, "Ingresá un username o teléfono")
    .max(32, "Identificador demasiado largo"),
});

export const tokenEnlaceSchema = z
  .string()
  .trim()
  .min(8, "Enlace inválido")
  .regex(/^[a-f0-9]+$/i, "Enlace inválido");

export type MatchFormato = z.infer<typeof matchFormatoSchema>;
export type CrearEquipoInput = z.infer<typeof crearEquipoSchema>;
export type InvitarJugadorInput = z.infer<typeof invitarJugadorSchema>;
