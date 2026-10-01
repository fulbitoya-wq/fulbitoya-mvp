"use client";

import { useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { completeAuthFromUrl } from "@/lib/auth-from-url";
import { appDeepLink } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

export default function ResetPage() {
  const [password, setPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setErr("Falta configurar Supabase.");
      return;
    }
    void completeAuthFromUrl(supabase).then((res) => {
      if (!res.ok) {
        setErr("El link expiró o se abrió mal. Pedí uno nuevo desde la app.");
        return;
      }
      setReady(true);
    });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (password.length < 8) {
      setErr("Mínimo 8 caracteres.");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErr(error.message);
      return;
    }
    setMsg("Contraseña actualizada. Volvé a la app e ingresá.");
  };

  return (
    <SiteShell>
      <h1 className="font-display text-5xl text-plc-white">Nueva contraseña</h1>
      {err ? <p className="mt-3 text-sm text-plc-danger">{err}</p> : null}
      {msg ? <p className="mt-3 text-sm text-plc-success">{msg}</p> : null}
      {ready && !msg ? (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Nueva contraseña"
            className="field-plc"
          />
          <button type="submit" disabled={loading} className="btn-gold">
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
      ) : null}
      {msg ? (
        <a href={appDeepLink("auth/callback")} className="btn-gold mt-6">
          Abrir PorLaCancha
        </a>
      ) : null}
    </SiteShell>
  );
}
