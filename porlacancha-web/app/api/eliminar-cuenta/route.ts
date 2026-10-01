import { NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ ok: false, error: "Email inválido." }, { status: 400 });
  }
  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "Falta configurar Supabase." }, { status: 500 });
  }
  const { error } = await supabase.from("cuenta_eliminacion_solicitudes").insert({ email });
  if (error) {
    return NextResponse.json({ ok: false, error: "No se pudo guardar." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
