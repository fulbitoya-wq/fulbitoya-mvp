import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});

export const registerSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es demasiado corto"),
  email: z.string().trim().email("Ingresá un email válido"),
  telefono: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Ingresá un email válido"),
});

export const completePhoneSchema = z.object({
  telefono: z.string().trim().min(6, "Ingresá un teléfono válido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type CompletePhoneInput = z.infer<typeof completePhoneSchema>;

export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Datos inválidos";
}
