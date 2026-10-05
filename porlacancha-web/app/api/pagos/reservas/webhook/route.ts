import { NextResponse } from "next/server";
import { mpAccessToken } from "@/lib/mp";
import { reembolsarPagoMp } from "@/lib/mp-refund";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type MpPayment = {
  id?: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number;
  metadata?: { hold_id?: string; origen?: string } | null;
};

async function fetchPayment(paymentId: string): Promise<MpPayment | null> {
  const accessToken = mpAccessToken();
  if (!accessToken) return null;
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!r.ok) return null;
  return (await r.json()) as MpPayment;
}

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
    paymentId = url.searchParams.get("id") || url.searchParams.get("data.id");
  }
  if (!paymentId) return NextResponse.json({ ok: true, note: "sin id" });

  const payment = await fetchPayment(paymentId);
  if (!payment) return NextResponse.json({ ok: false }, { status: 502 });
  if (payment.status !== "approved") {
    return NextResponse.json({ ok: true, status: payment.status });
  }
  if (payment.metadata?.origen && payment.metadata.origen !== "porlacancha") {
    return NextResponse.json({ ok: true, note: "no es reserva plc" });
  }

  const holdId = payment.metadata?.hold_id?.trim() || payment.external_reference?.trim() || null;
  const monto = Number(payment.transaction_amount ?? 0);
  if (!holdId || !Number.isFinite(monto) || monto <= 0) {
    return NextResponse.json({ ok: true, note: "metadata incompleta" });
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const { data, error } = await admin.rpc("plc_confirmar_pago_reserva", {
    p_hold_id: holdId,
    p_mp_payment_id: payment.id != null ? String(payment.id) : paymentId,
    p_monto: monto,
  });
  if (error) {
    console.error("plc_confirmar_pago_reserva", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const row = data as { ok?: boolean; error?: string } | null;
  if (row && row.ok === false && row.error === "reembolsar") {
    const pid = payment.id != null ? String(payment.id) : paymentId;
    await reembolsarPagoMp(pid);
    return NextResponse.json({ ok: true, reembolsado: true });
  }
  return NextResponse.json({ ok: true, result: data });
}
