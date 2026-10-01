export const USERNAME_EN_USO = "Ese nombre de usuario ya está en uso";

export type EquiposClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (column: string, value: string) => {
        select: (columns: string) => {
          maybeSingle: () => PromiseLike<{
            data: { id?: string; username?: string | null } | null;
            error: { message?: string; code?: string; details?: string } | null;
          }>;
        };
      };
    };
  };
};

export function interpretarErrorUsername(error: {
  message?: string;
  code?: string;
  details?: string;
} | null | undefined): string {
  if (!error) return "No se pudo guardar el username.";
  const blob = `${error.code ?? ""} ${error.message ?? ""} ${error.details ?? ""}`.toLowerCase();
  if (
    error.code === "23505" ||
    blob.includes("duplicate") ||
    blob.includes("unique") ||
    blob.includes("uq_usuarios_username") ||
    blob.includes("already exists")
  ) {
    return USERNAME_EN_USO;
  }
  if (error.code === "23514" || blob.includes("usuarios_username_format")) {
    return "Username inválido. Usá 3 a 20 caracteres: letras, números y guion bajo.";
  }
  const msg = error.message?.trim();
  return msg && msg.length > 0 ? msg : "No se pudo guardar el username.";
}

export async function guardarUsername(
  client: EquiposClient,
  userId: string,
  username: string
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const normalized = username.trim().toLowerCase();
  const { data, error } = await client
    .from("usuarios")
    .update({ username: normalized })
    .eq("id", userId)
    .select("id, username")
    .maybeSingle();

  if (error) {
    return { ok: false, error: interpretarErrorUsername(error) };
  }
  if (!data?.id) {
    return {
      ok: false,
      error: "No se pudo guardar el username. Cerrá sesión e ingresá de nuevo.",
    };
  }
  return { ok: true, username: data.username ?? normalized };
}
