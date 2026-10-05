"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { firstZodError, loginSchema } from "@shared/validation/auth";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { redirectPathForUser } from "@/lib/auth/profile";
import { supabase } from "@/lib/supabase";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(firstZodError(parsed.error));
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    if (data.user) {
      const nextParam = searchParams.get("next");
      const savedRedirect =
        typeof window !== "undefined" ? localStorage.getItem("authRedirectAfterLogin") : null;
      const target =
        (nextParam && nextParam.startsWith("/") ? nextParam : null) ||
        (savedRedirect && savedRedirect.startsWith("/") ? savedRedirect : null) ||
        (await redirectPathForUser(data.user.id, "/dashboard"));
      if (typeof window !== "undefined") {
        localStorage.removeItem("authRedirectAfterLogin");
      }
      router.push(target);
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center bg-[#1A2E4A] px-4 py-12">
      <div className="w-full max-w-md rounded-xl border border-[#E0E0E0] bg-white p-8 shadow-lg">
        <h1 className="font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">Ingresar</h1>
        <p className="mt-2 text-sm text-[#1A2E4A]/70">Ingresá para cargar horarios y ver reservas.</p>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

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
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-[#E0E0E0] px-4 py-3 focus:border-[#4CAF50] focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#4CAF50] py-3 font-medium text-white transition hover:bg-[#388E3C] disabled:opacity-70"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-4">
          <GoogleAuthButton label="Continuar con Google" />
        </div>

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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-[80vh] bg-[#1A2E4A]" />}>
      <LoginForm />
    </Suspense>
  );
}
