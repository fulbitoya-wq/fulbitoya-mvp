export {
  crearEquipoSchema,
  invitarJugadorSchema,
  matchFormatoSchema,
  tokenEnlaceSchema,
  normalizeUsername,
  usernameSchema,
  type CrearEquipoInput,
  type InvitarJugadorInput,
  type MatchFormato,
} from "../validation/equipos";
export { EQUIPOS_RPC_ERRORS, mensajeErrorEquipo } from "./errors";
export {
  rpcCrearEquipo,
  rpcExpulsarJugador,
  rpcGenerarEnlaceEquipo,
  rpcGetEquipoPorToken,
  rpcInscribirEquipo,
  rpcCancelarInscripcion,
  rpcEditarConvocados,
  rpcInvitarJugador,
  rpcResponderSolicitud,
  rpcSalirDelEquipo,
  rpcSolicitarIngresoPorToken,
  rpcTransferirCapitania,
  type EquiposRpcClient,
  type RpcResult,
} from "./rpc";
export {
  guardarUsername,
  interpretarErrorUsername,
  USERNAME_EN_USO,
} from "./username";

export function enlaceUnirseMobile(token: string): string {
  return `porlacancha://equipo/unirse/${token}`;
}

/** Vista web clickeable en WhatsApp: https://porlacancha.com/e/{token} */
export function enlaceUnirseWeb(appBaseUrl: string, token: string): string {
  const base = appBaseUrl.replace(/\/$/, "");
  return `${base}/e/${token}`;
}

/** Prefiere HTTPS si hay sitio; si no, el scheme de la app (no clickeable en WhatsApp). */
export function enlaceCompartirEquipo(token: string, webBaseUrl?: string | null): string {
  const base = webBaseUrl?.trim();
  if (base) return enlaceUnirseWeb(base, token);
  return enlaceUnirseMobile(token);
}
