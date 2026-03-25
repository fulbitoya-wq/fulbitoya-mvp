import { Search, CalendarCheck, Trophy } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Buscá",
    description: "Encontrá tu cancha ideal por ubicación, tipo y horario.",
  },
  {
    icon: CalendarCheck,
    title: "Elegí tu turno",
    description: "Reservá online al instante de forma segura.",
  },
  {
    icon: Trophy,
    title: "¡Jugá ya!",
    description: "Presentate en la cancha y disfrutá del partido.",
  },
];

export function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-[var(--secondary)] py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="font-heading text-3xl tracking-wide text-[var(--foreground)] sm:text-4xl">
            ¿Cómo funciona?
          </h2>
          <p className="mt-2 text-[var(--muted-foreground)]">
            Reservá tu cancha en 3 simples pasos
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="relative text-center">
              {index < steps.length - 1 && (
                <div className="absolute left-1/2 top-12 hidden h-0.5 w-full bg-[var(--border)] sm:block" />
              )}
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-[var(--fulbito-navy)]">
                <step.icon className="h-10 w-10 text-white" />
                <span className="absolute -right-1 -top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--fulbito-green)] text-sm font-bold text-white">
                  {index + 1}
                </span>
              </div>
              <h3 className="mt-6 font-heading text-2xl tracking-wide text-[var(--foreground)]">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
