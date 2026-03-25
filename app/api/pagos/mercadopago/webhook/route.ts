import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: {
    disponibilidad_id?: string;
    organizador_id?: string;
    monto_sena?: number;
  } | null;
};

async function fetchPayment(paymentId: string): Promise<MpPayment | null> {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) return null;

  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return (await r.json()) as MpPayment;
}

/** MP puede validar la URL con GET */
export async function GET() {
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  let paymentId: string | null = null;

  try {
    const body = await req.json();
    if (body?.data?.id != null) paymentId = String(body.data.id);
    else if (body?.id != null) paymentId = String(body.id);
  } catch {
    const url = new URL(req.url);
    const qId = url.searchParams.get("id") || url.searchParams.get("data.id");
    if (qId) paymentId = qId;
  }

  if (!paymentId) {
    return NextResponse.json({ ok: true, note: "sin id de pago" });
  }

  const payment = await fetchPayment(paymentId);
  if (!payment) {
    return NextResponse.json({ ok: false }, { status: 502 });
  }

  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status });
  }

  const disponibilidadId =
    payment.metadata?.disponibilidad_id?.trim() ??
    payment.external_reference?.trim() ??
    null;
  const organizadorId = payment.metadata?.organizador_id?.trim() ?? null;
  const monto = Number(payment.metadata?.monto_sena ?? payment.transaction_amount ?? 0);
  if (!disponibilidadId || !organizadorId || !Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ ok: true, note: "metadata incompleta" });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (e) {
    console.error("Webhook MP: falta SUPABASE_SERVICE_ROLE_KEY", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const { data, error } = await admin.rpc("confirmar_pago_desde_disponibilidad", {
    p_disponibilidad_id: disponibilidadId,
    p_organizador_id: organizadorId,
    p_mp_payment_id: payment.id != null ? String(payment.id) : paymentId,
    p_monto: monto,
  });

  if (error) {
    console.error("confirmar_pago_reserva:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, result: data });
}
