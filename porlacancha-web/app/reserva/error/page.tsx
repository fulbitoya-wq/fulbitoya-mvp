import { OpenInApp } from "@/components/OpenInApp";
import { SiteShell } from "@/components/SiteShell";

export default function ReservaErrorPage() {
  return (
    <SiteShell>
      <h1 className="font-display text-3xl text-plc-white">No se completó el pago</h1>
      <p className="mt-3 text-plc-text-secondary">
        El turno queda libre en unos minutos si no se aprueba el pago. Podés intentar de nuevo desde la app.
      </p>
      <OpenInApp path="" label="Volver a la app" />
    </SiteShell>
  );
}
