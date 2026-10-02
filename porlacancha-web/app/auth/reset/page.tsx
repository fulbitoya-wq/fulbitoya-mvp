import { ResetClient } from "./ResetClient";
import { supabaseBrowserConfig } from "@/lib/supabase";

export default function ResetPage() {
  const { url, anon } = supabaseBrowserConfig();
  return <ResetClient url={url} anon={anon} />;
}
