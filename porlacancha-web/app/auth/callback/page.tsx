import { CallbackClient } from "./CallbackClient";
import { supabaseBrowserConfig } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const { url, anon } = supabaseBrowserConfig();
  return <CallbackClient url={url} anon={anon} />;
}
