import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Combina clases de Tailwind sin pisarse */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formato de precio en ARS */
export function formatARS(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
  }).format(value);
}
