export default function DashboardCamposPage() {
  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Mis campos
      </h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Los campos se gestionan por complejo.
      </p>
      <p className="mt-2 text-[#1A2E4A]/70">
        Andá a <a className="font-medium text-[var(--fulbito-green)] underline" href="/dashboard/canchas">Mis canchas</a> y usá <b>Ver campos</b>.
      </p>
    </div>
  );
}
