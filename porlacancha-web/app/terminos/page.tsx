import { readFileSync } from "fs";
import { join } from "path";
import type { Metadata } from "next";
import { DraftBanner } from "@/components/SiteShell";
import { MarketingLayout, PageIntro } from "@/components/landing/MarketingLayout";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = { title: "Términos y condiciones" };

export default function TerminosPage() {
  const md = readFileSync(join(process.cwd(), "content/terminos.md"), "utf8");
  return (
    <MarketingLayout>
      <main className="mx-auto max-w-[1440px] px-5 py-12 sm:px-8 lg:px-16 lg:py-16">
        <PageIntro
          kicker="LEGAL"
          title="Términos y condiciones"
          lead="Condiciones de uso de PorLaCancha. Este texto es un borrador hasta la revisión legal."
        />
        <div className="mt-8 max-w-3xl">
          <DraftBanner />
          <article className="prose-legal mt-4" dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }} />
        </div>
      </main>
    </MarketingLayout>
  );
}
