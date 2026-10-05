export async function enviarSmsOtp(
  telefono: string,
  codigo: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  const from = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!sid || !token || !from) {
    return { ok: false, error: "Twilio no está configurado." };
  }

  const to = telefono.startsWith("+") ? telefono : `+${telefono}`;
  const body = new URLSearchParams({
    To: to,
    From: from,
    Body: `PorLaCancha: tu código es ${codigo}. Vence en 10 minutos.`,
  });

  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!res.ok) {
    return { ok: false, error: "No se pudo enviar el SMS." };
  }
  return { ok: true };
}
