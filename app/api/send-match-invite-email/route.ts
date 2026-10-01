import { NextResponse } from "next/server";
import { Resend } from "resend";

const from = process.env.SMTP_FROM || "FulbitoYa <onboarding@resend.dev>";
const appBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key?.trim()) return null;
  return new Resend(key);
}

export async function POST(req: Request) {
  try {
    const resend = getResend();
    const { email, matchId } = await req.json();

    if (!email || !matchId) {
      return NextResponse.json({ ok: false, error: "Faltan parámetros" }, { status: 400 });
    }

    if (!resend) {
      return NextResponse.json({ ok: true, mocked: true });
    }

    const actionUrl = `${appBaseUrl}/jugador/matches/${encodeURIComponent(matchId)}`;
    const { error } = await resend.emails.send({
      from,
      to: email,
      subject: "Te invitaron a un match en FulbitoYa",
      text: `Te invitaron a un match. Entrá para responder la invitación: ${actionUrl}`,
    });

    if (error) {
      console.error("send-match-invite-email error:", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("send-match-invite-email fatal:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
