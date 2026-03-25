import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const from = process.env.SMTP_FROM || "FulbitoYa <onboarding@resend.dev>";
const appBaseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  try {
    const { email, teamName, type } = await req.json();

    const subject =
      type === "registered"
        ? `Te invitaron al equipo ${teamName}`
        : `Registrate para unirte al equipo ${teamName}`;

    const actionUrl =
      type === "registered"
        ? `${appBaseUrl}/jugador/invitaciones`
        : `${appBaseUrl}/registro?email=${encodeURIComponent(email)}`;

    const text =
      type === "registered"
        ? `Te invitaron a unirte al equipo "${teamName}". Entrá a tu cuenta y aceptá la invitación: ${actionUrl}`
        : `Te invitaron a unirte al equipo "${teamName}". Registrate con este email para aceptar la invitación: ${actionUrl}`;

    const { error } = await resend.emails.send({
      from,
      to: email,
      subject,
      text,
    });

    if (error) {
      console.error("Error sending invite email (Resend):", error);
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Error sending invite email:", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

