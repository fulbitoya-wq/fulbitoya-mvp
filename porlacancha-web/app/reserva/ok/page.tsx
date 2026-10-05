import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";

export default function ReservaOkPage() {
  return (
    <SiteShell>
      <h1 className="font-display text-3xl text-plc-white">Pago recibido</h1>
      <p className="mt-3 text-plc-text-secondary">
        Si Mercado Pago aprobó el pago, el turno queda a tu nombre. Abrí la app para compartirlo, cargar la lista o abrir el partido si te falta gente.
      </p>
      <OpenInApp path="matches" label="Ver mi reserva" />
    </SiteShell>
  );
}
