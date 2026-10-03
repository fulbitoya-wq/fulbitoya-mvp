import { APP_STORE_URL, PLAY_STORE_URL } from "@/lib/site";

type Props = {
  className?: string;
};

export function StoreBadges({ className = "" }: Props) {
  const appHref = APP_STORE_URL || undefined;
  const playHref = PLAY_STORE_URL || undefined;

  return (
    <div className={`flex flex-wrap items-center gap-4 ${className}`}>
      <a
        href={appHref ?? "#descargar"}
        aria-disabled={!appHref}
        aria-label="Descargar en el App Store"
        className="landing-badge inline-flex h-[56px] w-[168px] items-center justify-center sm:h-[60px] sm:w-[178px]"
        {...(appHref ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {/* Official Apple badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badges/app-store.svg"
          alt="Descargar en el App Store"
          className="h-full w-full object-contain object-left"
        />
      </a>
      <a
        href={playHref ?? "#descargar"}
        aria-disabled={!playHref}
        aria-label="Disponible en Google Play"
        className="landing-badge inline-flex h-[56px] w-[188px] items-center justify-center sm:h-[60px] sm:w-[200px]"
        {...(playHref ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {/* Official Google Play badge */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/badges/google-play.png"
          alt="Disponible en Google Play"
          className="h-[56px] w-auto max-w-[200px] object-contain object-left sm:h-[60px]"
        />
      </a>
    </div>
  );
}
