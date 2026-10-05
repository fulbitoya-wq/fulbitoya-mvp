import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";

export default function ReservaPendientePage() {
  return (
    <SiteShell>
      <h1 className="font-display text-3xl text-plc-white">Pago pendiente</h1>
      <p className="mt-3 text-plc-text-secondary">
        Cuando Mercado Pago lo apruebe, la reserva aparece en tu cuenta. El turno está reservado unos minutos.
      </p>
      <OpenInApp path="matches" label="Abrir en la app" />
    </SiteShell>
  );
}
