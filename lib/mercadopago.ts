// FulbitoYa! — Mercado Pago
// Configuración del SDK y helpers para checkout.
// Requiere: npm install @mercadopago/sdk-react

// export function initMercadoPago(publicKey: string) { ... }
// Las preferencias se crean desde la API route /api/checkout-mp

export const MP_CONFIG = {
  publicKey: process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ?? "",
};
