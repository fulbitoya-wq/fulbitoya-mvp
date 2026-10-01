import type { Metadata } from "next";
import { SiteShell } from "@/components/SiteShell";
import { CONTACT_EMAIL } from "@/lib/site";

export const metadata: Metadata = { title: "Soporte" };

export default function SoportePage() {
  return (
    <SiteShell>
      <h1 className="font-display text-5xl text-plc-white">Soporte</h1>
      <p className="mt-3 text-sm leading-6 text-plc-text-secondary">
        Escribinos y te respondemos a la brevedad. No uses este mail para inscribir un equipo: eso
        se hace en la app.
      </p>
      <a href={`mailto:${CONTACT_EMAIL}`} className="btn-gold mt-6">
        {CONTACT_EMAIL}
      </a>
    </SiteShell>
  );
}
