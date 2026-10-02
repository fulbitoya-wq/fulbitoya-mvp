"use client";

import { useEffect, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { StoreButtons } from "@/components/StoreButtons";
import { completeAuthFromUrl } from "@/lib/auth-from-url";
import { appDeepLink } from "@/lib/site";
import { getSupabase } from "@/lib/supabase";

type Props = { url: string; anon: string };

export function ConfirmadoClient({ url, anon }: Props) {
  const [status, setStatus] = useState<"working" | "ok" | "warn">("working");
  const [detail, setDetail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase(url, anon);
    if (!supabase) {
      setStatus("ok");
      return;
    }
    void completeAuthFromUrl(supabase).then((res) => {
      if (res.ok) {
        setStatus("ok");
        return;
      }
      if (res.error) {
        setStatus("warn");
        setDetail(res.error);
        return;
      }
      setStatus("ok");
    });
  }, [url, anon]);

  return (
    <SiteShell>
      <h1 className="font-display text-5xl text-plc-white">Cuenta confirmada, volvé a la app</h1>
      <p className="mt-3 text-sm leading-6 text-plc-text-secondary">
        {status === "working"
          ? "Estamos confirmando tu email…"
          : "Ya podés cerrar esta pestaña. Si PorLaCancha está instalada, abrila e ingresá con el mismo email."}
      </p>
      {status === "warn" && detail ? (
        <p className="mt-3 text-sm text-plc-warning">
          El link puede haber vencido. Si no podés entrar, pedí otro mail de confirmación desde la app.
        </p>
      ) : null}
      <a href={appDeepLink("auth/callback")} className="btn-gold mt-6">
        Abrir PorLaCancha
      </a>
      <div className="mt-4">
        <StoreButtons />
      </div>
    </SiteShell>
  );
}
