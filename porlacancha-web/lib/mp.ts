export function mpAccessToken(): string | null {
  const t =
    process.env.PLC_MERCADOPAGO_ACCESS_TOKEN?.trim() ||
    process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() ||
    "";
  return t || null;
}
