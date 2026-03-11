import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#1A2E4A] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-lg">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
          Ingresar
        </h1>
        <p className="mt-2 text-sm text-[#1A2E4A]/70">
          Email y contraseña — integración Supabase Auth en construcción.
        </p>
        <form className="mt-6 space-y-4">
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
          <button
            type="submit"
            className="w-full rounded-lg bg-[#4CAF50] py-3 font-medium text-white transition hover:bg-[#388E3C]"
          >
            Ingresar
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-[#1A2E4A]/70">
          ¿No tenés cuenta?{" "}
          <Link href="/registro" className="font-medium text-[#4CAF50] hover:underline">
            Registrate
          </Link>
        </p>
      </div>
    </div>
  );
}
