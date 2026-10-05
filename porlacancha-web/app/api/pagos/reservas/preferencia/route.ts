import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { mpAccessToken } from "@/lib/mp";
import { siteUrl } from "@/lib/site";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json({ error: "Configuración incompleta." }, { status: 500 });
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
  } = await authClient.auth.getUser(token);
  if (!user?.id) {
    return NextResponse.json({ error: "Tenés que iniciar sesión." }, { status: 401 });
  }

  let body: { holdId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }
  const holdId = body.holdId?.trim();
  if (!holdId) {
    return NextResponse.json({ error: "Falta el hold." }, { status: 400 });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ error: "Servidor sin service role." }, { status: 500 });
  }

  const { data: hold, error } = await admin
    .from("plc_checkout_hold")
    .select("id, usuario_id, monto, expira_at, disponibilidad_id")
    .eq("id", holdId)
    .maybeSingle();

  if (error || !hold || hold.usuario_id !== user.id) {
    return NextResponse.json({ error: "Ese checkout ya no está." }, { status: 400 });
  }
  if (new Date(hold.expira_at).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Se venció el tiempo para pagar." }, { status: 400 });
  }

  const accessToken = mpAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Mercado Pago de PorLaCancha no está configurado." }, { status: 503 });
  }

  const monto = Number(hold.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ error: "Monto inválido." }, { status: 400 });
  }

  const payerEmail = user.email?.trim();
  if (!payerEmail) {
    return NextResponse.json({ error: "Tu cuenta no tiene email para pagar." }, { status: 400 });
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);
  const base = siteUrl;
  const isLocal = base.includes("localhost") || base.includes("127.0.0.1");

  try {
    const result = await preference.create({
      body: {
        items: [
          {
            id: holdId,
            title: "Reserva PorLaCancha",
            quantity: 1,
            unit_price: monto,
            currency_id: "ARS",
          },
        ],
        payer: { email: payerEmail },
        external_reference: holdId,
        metadata: {
          hold_id: holdId,
          origen: "porlacancha",
          usuario_id: user.id,
        },
        back_urls: {
          success: `${base}/reserva/ok`,
          failure: `${base}/reserva/error`,
          pending: `${base}/reserva/pendiente`,
        },
        auto_return: "approved",
        ...(isLocal ? {} : { notification_url: `${base}/api/pagos/reservas/webhook` }),
      },
    });

    const preferenceId = result.id?.toString() ?? null;
    if (preferenceId) {
      await admin.from("plc_checkout_hold").update({ mp_preference_id: preferenceId }).eq("id", holdId);
    }

    const initPoint =
      result.init_point ?? (result as { sandbox_init_point?: string }).sandbox_init_point ?? null;

    return NextResponse.json({ init_point: initPoint, preference_id: preferenceId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "No se pudo crear el pago.";
    return NextResponse.json({ error: `Mercado Pago: ${msg}` }, { status: 502 });
  }
}
