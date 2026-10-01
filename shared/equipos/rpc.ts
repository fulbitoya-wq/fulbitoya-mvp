export type EquiposRpcClient = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};

export type RpcResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; quienes?: string; minimo?: number };

function parseRpc(data: unknown, fallbackError: string): RpcResult<Record<string, unknown>> {
  if (!data || typeof data !== "object") {
    return { ok: false, error: fallbackError };
  }
  const row = data as { ok?: boolean; error?: string; quienes?: string; minimo?: number } & Record<string, unknown>;
  if (row.ok === true) {
    const { ok: _ok, error: _e, ...rest } = row;
    return { ok: true, ...rest };
  }
  return {
    ok: false,
    error: typeof row.error === "string" ? row.error : fallbackError,
    quienes: typeof row.quienes === "string" ? row.quienes : undefined,
    minimo: typeof row.minimo === "number" ? row.minimo : undefined,
  };
}

async function call(
  client: EquiposRpcClient,
  fn: string,
  args: Record<string, unknown>
): Promise<RpcResult<Record<string, unknown>>> {
  const { data, error } = await client.rpc(fn, args);
  if (error) return { ok: false, error: error.message };
  return parseRpc(data, "rpc_error");
}

export async function rpcCrearEquipo(
  client: EquiposRpcClient,
  input: {
    nombre: string;
    escudo_url?: string | null;
    formato_habitual: "f5" | "f7" | "f9" | "f11";
    provincia_id?: string | null;
    partido_id?: string | null;
    localidad_id?: string | null;
  }
): Promise<RpcResult<{ equipo_id: string }>> {
  const res = await call(client, "crear_equipo", {
    p_nombre: input.nombre,
    p_escudo_url: input.escudo_url ?? null,
    p_formato: input.formato_habitual,
    p_provincia_id: input.provincia_id ?? null,
    p_partido_id: input.partido_id ?? null,
    p_localidad_id: input.localidad_id ?? null,
  });
  if (!res.ok) return res;
  const equipo_id = String(res.equipo_id ?? "");
  if (!equipo_id) return { ok: false, error: "rpc_error" };
  return { ok: true, equipo_id };
}

export async function rpcGenerarEnlaceEquipo(
  client: EquiposRpcClient,
  equipoId: string
): Promise<RpcResult<{ token: string }>> {
  const res = await call(client, "generar_enlace_equipo", { p_equipo_id: equipoId });
  if (!res.ok) return res;
  const token = String(res.token ?? "");
  if (!token) return { ok: false, error: "rpc_error" };
  return { ok: true, token };
}

export async function rpcSolicitarIngresoPorToken(
  client: EquiposRpcClient,
  token: string
): Promise<RpcResult<{ equipo_id: string }>> {
  const res = await call(client, "solicitar_ingreso_por_token", { p_token: token });
  if (!res.ok) return res;
  return { ok: true, equipo_id: String(res.equipo_id ?? "") };
}

export async function rpcInvitarJugador(
  client: EquiposRpcClient,
  equipoId: string,
  identificador: string
): Promise<RpcResult<{ usuario_id: string }>> {
  const res = await call(client, "invitar_jugador", {
    p_equipo_id: equipoId,
    p_identificador: identificador,
  });
  if (!res.ok) return res;
  return { ok: true, usuario_id: String(res.usuario_id ?? "") };
}

export async function rpcResponderSolicitud(
  client: EquiposRpcClient,
  solicitudId: string,
  aceptar: boolean
): Promise<RpcResult<{ estado: string }>> {
  const res = await call(client, "responder_solicitud", {
    p_solicitud_id: solicitudId,
    p_aceptar: aceptar,
  });
  if (!res.ok) return res;
  return { ok: true, estado: String(res.estado ?? "") };
}

export async function rpcSalirDelEquipo(
  client: EquiposRpcClient,
  equipoId: string
): Promise<RpcResult> {
  const res = await call(client, "salir_del_equipo", { p_equipo_id: equipoId });
  if (!res.ok) return res;
  return { ok: true };
}

export async function rpcTransferirCapitania(
  client: EquiposRpcClient,
  equipoId: string,
  nuevoCapitanId: string
): Promise<RpcResult> {
  const res = await call(client, "transferir_capitania", {
    p_equipo_id: equipoId,
    p_nuevo_capitan_id: nuevoCapitanId,
  });
  if (!res.ok) return res;
  return { ok: true };
}

export async function rpcExpulsarJugador(
  client: EquiposRpcClient,
  equipoId: string,
  usuarioId: string
): Promise<RpcResult> {
  const res = await call(client, "expulsar_jugador", {
    p_equipo_id: equipoId,
    p_usuario_id: usuarioId,
  });
  if (!res.ok) return res;
  return { ok: true };
}

export async function rpcGetEquipoPorToken(
  client: EquiposRpcClient,
  token: string
): Promise<
  RpcResult<{
    nombre: string;
    escudo_url: string | null;
    formato: string | null;
    zona: string | null;
    miembros: number;
  }>
> {
  const res = await call(client, "get_equipo_por_token", { p_token: token });
  if (!res.ok) return res;
  return {
    ok: true,
    nombre: String(res.nombre ?? ""),
    escudo_url: (res.escudo_url as string | null) ?? null,
    formato: (res.formato as string | null) ?? null,
    zona: (res.zona as string | null) ?? null,
    miembros: Number(res.miembros ?? 0),
  };
}

export async function rpcInscribirEquipo(
  client: EquiposRpcClient,
  desafioId: string,
  equipoId: string,
  convocados: string[]
): Promise<RpcResult<{ inscripcion_id: string; estado: string }>> {
  const res = await call(client, "inscribir_equipo", {
    p_desafio_id: desafioId,
    p_equipo_id: equipoId,
    p_convocados: convocados,
  });
  if (!res.ok) return res;
  return {
    ok: true,
    inscripcion_id: String(res.inscripcion_id ?? ""),
    estado: String(res.estado ?? ""),
  };
}

export async function rpcCancelarInscripcion(
  client: EquiposRpcClient,
  inscripcionId: string
): Promise<RpcResult> {
  const res = await call(client, "cancelar_inscripcion", { p_inscripcion_id: inscripcionId });
  if (!res.ok) return res;
  return { ok: true };
}

export async function rpcEditarConvocados(
  client: EquiposRpcClient,
  inscripcionId: string,
  convocados: string[]
): Promise<RpcResult> {
  const res = await call(client, "editar_convocados", {
    p_inscripcion_id: inscripcionId,
    p_convocados: convocados,
  });
  if (!res.ok) return res;
  return { ok: true };
}
