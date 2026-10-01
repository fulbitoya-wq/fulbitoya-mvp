import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { DraftBanner, SiteShell } from "@/components/SiteShell";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "Privacidad" };

export default function PrivacidadPage() {
  const md = readFileSync(join(process.cwd(), "content/privacidad.md"), "utf8");
  return (
    <SiteShell>
      <DraftBanner />
      <article className="prose-legal mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
    </SiteShell>
  );
}
