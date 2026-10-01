"use client";

import { useState } from "react";
import { SiteShell } from "@/components/SiteShell";

export default function EliminarCuentaPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    const res = await fetch("/api/eliminar-cuenta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setLoading(false);
    if (!res.ok || !json.ok) {
      setErr(json.error || "No se pudo registrar la solicitud.");
      return;
    }
    setEmail("");
    setMsg("Listo. Vamos a procesar la baja de este email.");
  };

  return (
    <SiteShell>
      <h1 className="font-display text-5xl leading-none text-plc-white">Eliminar cuenta</h1>

      <h2 className="mt-6 text-sm font-extrabold text-plc-gold">Desde la app</h2>
      <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm leading-6 text-plc-text-secondary">
        <li>Abrí PorLaCancha e iniciá sesión con el email de la cuenta.</li>
        <li>Cerrar sesión (tab Equipos → Salir) no borra tus datos.</li>
        <li>
          Todavía no hay un botón de borrar adentro de la app. Para pedir la baja, usá el formulario
          de esta página o escribinos a soporte.
        </li>
      </ol>

      <h2 className="mt-8 text-sm font-extrabold text-plc-gold">Pedido por email</h2>
      <p className="mt-2 text-sm leading-6 text-plc-text-secondary">
        Dejamos registrada la solicitud. La resolvemos a mano hasta que la baja esté en la app.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-3">
        {err ? <p className="text-sm text-plc-danger">{err}</p> : null}
        {msg ? <p className="text-sm text-plc-success">{msg}</p> : null}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Tu email"
          className="field-plc"
        />
        <button type="submit" disabled={loading} className="btn-gold">
          {loading ? "Enviando..." : "Pedir eliminación"}
        </button>
      </form>
    </SiteShell>
  );
}
