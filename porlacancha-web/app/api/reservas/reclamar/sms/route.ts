import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { enviarSmsOtp } from "@/lib/sms";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const jwt = authHeader?.replace(/^Bearer\s+/i, "");
  if (!jwt) {
    return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ ok: false, error: "Configuración incompleta." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
  } = await authClient.auth.getUser(jwt);
  if (!user?.id) {
    return NextResponse.json({ ok: false, error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Cuerpo inválido." }, { status: 400 });
  }
  const token = body.token?.trim();
  if (!token) {
    return NextResponse.json({ ok: false, error: "Falta el enlace." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false, error: "Servidor sin service role." }, { status: 500 });
  }

  const { data, error } = await admin.rpc("plc_emitir_otp_reclamo_usuario", {
    p_token: token,
    p_usuario_id: user.id,
  });

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  const row = data as {
    ok?: boolean;
    error?: string;
    prueba?: boolean;
    codigo?: string | null;
    telefono?: string;
    telefono_enmascarado?: string;
    ya_reclamada?: boolean;
  } | null;

  if (!row || row.ok !== true) {
    return NextResponse.json(
      { ok: false, error: row?.error ?? "No se pudo enviar el código." },
      { status: 400 }
    );
  }

  if (row.ya_reclamada) {
    return NextResponse.json({ ok: true, ya_reclamada: true });
  }

  const prueba = Boolean(row.prueba);
  if (!prueba) {
    const tel = row.telefono ?? "";
    const codigo = row.codigo ?? "";
    if (!codigo || !tel) {
      return NextResponse.json({ ok: false, error: "No se pudo generar el código." }, { status: 500 });
    }
    const sent = await enviarSmsOtp(tel, codigo);
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: sent.error }, { status: 503 });
    }
  }

  return NextResponse.json({
    ok: true,
    prueba,
    codigo: prueba ? row.codigo : undefined,
    telefono_enmascarado: row.telefono_enmascarado,
  });
}
