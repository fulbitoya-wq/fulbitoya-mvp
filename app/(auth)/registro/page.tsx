import Link from "next/link";

export default function RegistroPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#1A2E4A] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-lg">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
          Crear cuenta
        </h1>
        <p className="mt-2 text-sm text-[#1A2E4A]/70">
          Nombre, email, contraseña, teléfono — rol jugador/dueño. En construcción.
        </p>
        <form className="mt-6 space-y-4">
          <input
            type="text"
            placeholder="Nombre"
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
          />
          <input
            type="password"
            placeholder="Contraseña"
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
          />
          <input
            type="tel"
            placeholder="Teléfono (WhatsApp)"
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
          />
          <div className="flex gap-4">
            <label className="flex items-center gap-2">
              <input type="radio" name="rol" value="jugador" defaultChecked />
              <span className="text-sm">Soy jugador</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="rol" value="owner" />
              <span className="text-sm">Soy dueño de cancha</span>
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[#4CAF50] py-3 font-medium text-white transition hover:bg-[#388E3C]"
          >
            Crear cuenta
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#1A2E4A]/70">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-[#4CAF50] hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
