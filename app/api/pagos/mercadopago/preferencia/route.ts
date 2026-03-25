import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const appBaseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_BASE_URL ||
  "http://localhost:3000";

export async function POST(req: Request) {
  console.log("🧪 SUPABASE URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log(
    "🧪 SUPABASE ANON KEY PREFIX:",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 20)
  );

  console.log("🚀 API HIT /api/pagos/mercadopago/preferencia");

  const authHeader = req.headers.get("authorization");
  console.log("🧪 AUTH HEADER:", authHeader);

  const token = authHeader?.replace(/^Bearer\s+/i, "");
  console.log("🧪 TOKEN:", token);
  if (!token) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para reservar" },
      { status: 401 }
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) {
    return NextResponse.json(
      { error: "Configuración incompleta." },
      { status: 500 }
    );
  }

  const authClient = createClient(supabaseUrl, anonKey);
  const {
    data: { user },
    error: authErr,
  } = await authClient.auth.getUser(token);

  if (authErr || !user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para reservar" },
      { status: 401 }
    );
  }

  let body: { disponibilidadId?: string };
  try {
    body = await req.json();
    console.log("🧪 BODY:", body);
  } catch (e) {
    console.log("❌ ERROR PARSE BODY:", e);
    return NextResponse.json(
      { error: "Cuerpo inválido." },
      { status: 400 }
    );
  }

  const disponibilidadId = body.disponibilidadId;
  if (typeof disponibilidadId !== "string" || !disponibilidadId) {
    return NextResponse.json(
      { error: "Falta disponibilidadId." },
      { status: 400 }
    );
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json(
      {
        error:
          "Servidor sin service role. Agregá SUPABASE_SERVICE_ROLE_KEY.",
      },
      { status: 500 }
    );
  }

  const { data: rpcData, error: rpcErr } = await admin.rpc(
    "get_sena_para_disponibilidad",
    {
      p_disponibilidad_id: disponibilidadId,
    }
  );

  console.log("🧪 RPC ERROR:", rpcErr);
  console.log("🧪 RPC RAW:", JSON.stringify(rpcData, null, 2));

  const dataRaw = Array.isArray(rpcData) ? rpcData[0] : rpcData;

  console.log("🧪 DATA RAW:", JSON.stringify(dataRaw, null, 2));
  console.log("🧪 TYPE OF OK:", typeof dataRaw?.ok);
  console.log("🧪 VALUE OF OK:", dataRaw?.ok);

  const ok =
    dataRaw?.ok === true ||
    dataRaw?.ok === "true" ||
    dataRaw?.ok === 1;

  console.log("🧪 OK NORMALIZED:", ok);

  if (rpcErr || !dataRaw || !ok) {
    return NextResponse.json(
      {
        debug: {
          rpcErr,
          rpcData,
          dataRaw,
          ok,
        },
        error: "Disponibilidad inválida o no disponible.",
      },
      { status: 400 }
    );
  }

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Mercado Pago no configurado. Agregá MERCADOPAGO_ACCESS_TOKEN en .env.local",
      },
      { status: 503 }
    );
  }

  const monto = Number(dataRaw.monto);
  if (!Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json(
      { error: "Monto de seña inválido." },
      { status: 400 }
    );
  }

  const payerEmail = user.email?.trim();
  if (!payerEmail) {
    return NextResponse.json(
      { error: "Tu cuenta no tiene email válido para pagar." },
      { status: 400 }
    );
  }

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  const base = appBaseUrl.replace(/\/$/, "");
  const isLocalhost =
    base.includes("localhost") || base.includes("127.0.0.1");

  const maybeNotificationUrl = !isLocalhost
    ? `${base}/api/pagos/mercadopago/webhook`
    : undefined;

  try {
    const mpBody = {
      items: [
        {
          id: disponibilidadId,
          title: "Reserva cancha",
          quantity: 1,
          unit_price: monto,
          currency_id: "ARS",
        },
      ],
      payer: {
        email: payerEmail,
      },
      external_reference: disponibilidadId,
      metadata: {
        disponibilidad_id: disponibilidadId,
        organizador_id: user.id,
        monto_sena: monto,
      },
      back_urls: {
        success: `${base}/reserva/ok`,
        failure: `${base}/reserva/error`,
        pending: `${base}/reserva/pendiente`,
      },
      auto_return: "approved",
      ...(maybeNotificationUrl
        ? { notification_url: maybeNotificationUrl }
        : {}),
    };

    // 🔍 LOGS CLAVE
    console.log("🟡 MP BODY:", JSON.stringify(mpBody, null, 2));
    console.log("🌍 BASE URL:", base);
    console.log("🔑 TOKEN PREFIX:", accessToken.slice(0, 10));
    console.log("👤 PAYER EMAIL:", payerEmail);
    console.log("💰 MONTO:", monto);

    const result = await preference.create({ body: mpBody });

    console.log("🟢 MP RESPONSE:", result);

    const preferenceId = result.id?.toString() ?? null;
    const initPoint =
      result.init_point ??
      (result as { sandbox_init_point?: string }).sandbox_init_point;

    return NextResponse.json({
      init_point: initPoint ?? null,
      preference_id: preferenceId,
    });
  } catch (e) {
    const errAny = e as any;

    console.log("🔴 MP STATUS:", errAny?.response?.status);
    console.log(
      "🔴 MP DATA:",
      JSON.stringify(errAny?.response?.data, null, 2)
    );
    console.log(
      "🔴 MP CAUSE:",
      JSON.stringify(errAny?.response?.data?.cause, null, 2)
    );
    console.log("🔴 FULL ERROR:", errAny);

    const mpMessage =
      errAny?.response?.data?.message ||
      errAny?.response?.data?.cause?.[0]?.description ||
      errAny?.message;

    return NextResponse.json(
      {
        error: mpMessage
          ? `Mercado Pago: ${mpMessage}`
          : "No se pudo crear el pago. Probá de nuevo.",
      },
      { status: 502 }
    );
  }
}