import {
  mensajeErrorEquipo,
  rpcEmitirOtpReclamo,
  rpcVerificarOtpReclamo,
  rpcVerReclamo,
} from "@shared/equipos";
import { supabase } from "./supabase";
import { webBaseUrl } from "./web-url";

export type ReclamoVista = {
  titular_nombre: string;
  telefono_enmascarado: string;
  verificado: boolean;
  cancha_nombre: string;
  campo_nombre: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
};

function str(v: unknown) {
  return v == null ? "" : String(v);
}

export async function verReclamo(token: string): Promise<{ data: ReclamoVista | null; error: string | null }> {
  const res = await rpcVerReclamo(supabase, token);
  if (!res.ok) return { data: null, error: mensajeErrorEquipo(res.error) };
  return {
    data: {
      titular_nombre: str(res.titular_nombre),
      telefono_enmascarado: str(res.telefono_enmascarado),
      verificado: Boolean(res.verificado),
      cancha_nombre: str(res.cancha_nombre),
      campo_nombre: str(res.campo_nombre),
      fecha: str(res.fecha),
      hora_inicio: str(res.hora_inicio).slice(0, 5),
      hora_fin: str(res.hora_fin).slice(0, 5),
    },
    error: null,
  };
}

export async function emitirCodigoReclamo(
  token: string,
  accessToken: string | undefined
): Promise<{ ok: true; prueba?: boolean; codigo?: string; enmascarado?: string } | { ok: false; error: string }> {
  const web = webBaseUrl();
  if (web && accessToken) {
    const r = await fetch(`${web}/api/reservas/reclamar/sms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token }),
    });
    const body = (await r.json().catch(() => null)) as {
      ok?: boolean;
      error?: string;
      prueba?: boolean;
      codigo?: string;
      telefono_enmascarado?: string;
      ya_reclamada?: boolean;
    } | null;
    if (r.ok && body?.ok) {
      return {
        ok: true,
        prueba: body.prueba,
        codigo: body.codigo,
        enmascarado: body.telefono_enmascarado,
      };
    }
    if (r.status !== 404 && body?.error) {
      return { ok: false, error: mensajeErrorEquipo(body.error) === body.error ? body.error : mensajeErrorEquipo(body.error) };
    }
  }

  const res = await rpcEmitirOtpReclamo(supabase, token);
  if (!res.ok) return { ok: false, error: mensajeErrorEquipo(res.error) };
  return {
    ok: true,
    prueba: Boolean(res.prueba),
    codigo: res.codigo ? str(res.codigo) : undefined,
    enmascarado: res.telefono_enmascarado ? str(res.telefono_enmascarado) : undefined,
  };
}

export async function verificarCodigoReclamo(token: string, codigo: string) {
  const res = await rpcVerificarOtpReclamo(supabase, token, codigo);
  if (!res.ok) return { ok: false as const, error: mensajeErrorEquipo(res.error) };
  return { ok: true as const };
}
