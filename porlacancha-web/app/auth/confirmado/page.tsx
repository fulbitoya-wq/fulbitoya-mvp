import type { Metadata } from "next";
import { ConfirmadoClient } from "./ConfirmadoClient";
import { supabaseBrowserConfig } from "@/lib/supabase";

export const metadata: Metadata = { title: "Cuenta confirmada" };

export default function ConfirmadoPage() {
  const { url, anon } = supabaseBrowserConfig();
  return <ConfirmadoClient url={url} anon={anon} />;
}
