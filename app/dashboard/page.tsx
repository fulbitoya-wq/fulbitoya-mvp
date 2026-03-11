export default function DashboardPage() {
  return (
    <div className="p-8">
      <h1 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
        Buen día 👋
      </h1>
      <p className="mt-1 text-[#1A2E4A]/70">
        Panel principal — KPIs y calendario en construcción.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {["Reservas hoy", "Ingresos del mes", "Canchas activas", "% Ocupación"].map((label) => (
          <div
            key={label}
            className="rounded-xl border border-[#E0E0E0] bg-white p-4 shadow-sm"
          >
            <p className="text-sm text-[#1A2E4A]/70">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-[#1A2E4A]">—</p>
          </div>
        ))}
      </div>
    </div>
  );
}
