import { mpAccessToken } from "@/lib/mp";

export async function reembolsarPagoMp(paymentId: string): Promise<boolean> {
  const accessToken = mpAccessToken();
  if (!accessToken || !paymentId) return false;
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}/refunds`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  return r.ok;
}
