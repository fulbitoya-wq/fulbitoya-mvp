import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Hero */}
      <section
        className="bg-gradient-to-b from-[#1A2E4A] to-[#2C4A72] px-4 py-20 text-white sm:px-6 lg:px-8"
        style={{ minHeight: "60vh", display: "flex", flexDirection: "column", justifyContent: "center" }}
      >
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="font-heading text-5xl uppercase tracking-wide sm:text-6xl md:text-7xl">
            ¡Encontrá tu cancha y jugá ya!
          </h1>
          <p className="mt-4 font-body text-lg text-white/90">
            La mejor plataforma de fútbol amateur de Buenos Aires
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <input
              type="text"
              placeholder="Barrio o zona"
              className="rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white placeholder-white/60 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            />
            <select className="rounded-lg border border-white/30 bg-white/10 px-4 py-3 text-white focus:border-[#4CAF50] focus:outline-none">
              <option value="">Tipo (5, 7, 11)</option>
              <option value="5">5</option>
              <option value="7">7</option>
              <option value="11">11</option>
            </select>
            <Link
              href="/canchas"
              className="rounded-lg bg-[#4CAF50] px-6 py-3 text-center font-medium text-white transition hover:bg-[#388E3C]"
            >
              Buscar cancha
            </Link>
          </div>
        </div>
      </section>

      {/* Canchas destacadas */}
      <section className="bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
            Canchas destacadas
          </h2>
          <p className="mt-2 text-[#1A2E4A]/70">
            Próximamente: grid de cards. Mientras tanto, explorá el listado.
          </p>
          <div className="mt-8">
            <Link
              href="/canchas"
              className="inline-flex rounded-lg border-2 border-[#1A2E4A] px-5 py-2.5 font-medium text-[#1A2E4A] transition hover:bg-[#1A2E4A] hover:text-white"
            >
              Ver todas las canchas
            </Link>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="bg-[#F5F5F5] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h2 className="font-subheading text-2xl font-semibold text-[#1A2E4A]">
            ¿Cómo funciona?
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50]">
                <span className="text-2xl font-bold">1</span>
              </div>
              <h3 className="mt-4 font-subheading font-semibold text-[#1A2E4A]">
                Buscá
              </h3>
              <p className="mt-2 text-sm text-[#1A2E4A]/80">
                Elegí barrio, tipo de cancha y encontrá turnos disponibles.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50]">
                <span className="text-2xl font-bold">2</span>
              </div>
              <h3 className="mt-4 font-subheading font-semibold text-[#1A2E4A]">
                Elegí tu turno
              </h3>
              <p className="mt-2 text-sm text-[#1A2E4A]/80">
                Reservá con un clic. Pagá todo vos o dividí con tu equipo.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#4CAF50]/20 text-[#4CAF50]">
                <span className="text-2xl font-bold">3</span>
              </div>
              <h3 className="mt-4 font-subheading font-semibold text-[#1A2E4A]">
                Jugá ya
              </h3>
              <p className="mt-2 text-sm text-[#1A2E4A]/80">
                Confirmación al toque. Llegá y disfrutá la cancha.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA owners */}
      <section className="bg-[#1A2E4A] px-4 py-16 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-heading text-3xl uppercase tracking-wide">
            ¿Tenés una cancha?
          </h2>
          <p className="mt-3 text-white/90">
            Sumala a la plataforma y empezá a recibir reservas.
          </p>
          <Link
            href="/registro"
            className="mt-6 inline-block rounded-lg bg-[#4CAF50] px-8 py-3 font-medium text-white transition hover:bg-[#388E3C]"
          >
            Sumá tu cancha gratis
          </Link>
        </div>
      </section>
    </>
  );
}
