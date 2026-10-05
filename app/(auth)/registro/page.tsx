"use client";

import Link from "next/link";
import { useState } from "react";
import { firstZodError, registerSchema } from "@shared/validation/auth";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { SuccessModal } from "@/components/SuccessModal";
import { supabase } from "@/lib/supabase";

export default function RegistroPage() {
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefono, setTelefono] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsed = registerSchema.safeParse({
      nombre,
      email,
      password,
      telefono,
    });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          nombre: parsed.data.nombre,
          telefono: parsed.data.telefono,
          origen_registro: "fulbitoya",
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    setShowSuccess(true);
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#1A2E4A] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-lg">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Crear cuenta</h1>
        <p className="mt-2 text-sm text-[#1A2E4A]/70">
          Cuenta de predio: horarios, reservas y cobros. Los jugadores usan PorLaCancha.
        </p>

        <form onSubmit={handleRegister} className="mt-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          <input
            type="text"
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            required
          />

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            required
          />

          <input
            type="password"
            placeholder="Contraseña (mín. 8)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            required
          />

          <input
            type="tel"
            placeholder="Teléfono (WhatsApp, opcional)"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#4CAF50] py-3 font-medium text-white transition hover:bg-[#388E3C]"
          >
            {loading ? "Creando..." : "Crear cuenta de predio"}
          </button>
        </form>

        <div className="mt-4">
          <GoogleAuthButton label="Continuar con Google" />
        </div>

        <p className="mt-4 text-center text-sm text-[#1A2E4A]/70">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="font-medium text-[#4CAF50] hover:underline">
            Ingresar
          </Link>
        </p>
      </div>

      <SuccessModal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="¡Cuenta creada!"
        message="Revisá el mail si pide confirmación. Después ingresá y cargá tu predio y los horarios."
        primaryAction={{ label: "Ir a ingresar", href: "/login" }}
      />
    </div>
  );
}
