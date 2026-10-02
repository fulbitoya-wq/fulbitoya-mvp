"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { completeAuthFromUrl } from "@/lib/auth-from-url";
import { getSupabase } from "@/lib/supabase";

type Props = { url: string; anon: string };

export function CallbackClient({ url, anon }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getSupabase(url, anon);
    const type = new URL(window.location.href).searchParams.get("type");
    const hashType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
    const kind = type || hashType;
    const goReset = kind === "recovery";

    const finish = () => {
      router.replace(goReset ? "/auth/reset" : "/auth/confirmado");
    };

    if (!supabase) {
      finish();
      return;
    }
    void completeAuthFromUrl(supabase).finally(finish);
  }, [router, url, anon]);

  return (
    <p className="px-5 py-20 text-center text-sm text-plc-text-secondary">Abriendo…</p>
  );
}
