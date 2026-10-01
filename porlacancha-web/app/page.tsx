import { BrandLogo } from "@/components/BrandLogo";
import { SiteShell } from "@/components/SiteShell";
import { StoreButtons } from "@/components/StoreButtons";
import { appStoreUrl, playStoreUrl } from "@/lib/site";

const pasos = [
  ["01", "Armá tu equipo", "Creá el plantel, nombrá capitán y sumá gente con un enlace."],
  ["02", "Inscribite a un desafío", "El capitán anota al equipo en un partido con premio."],
  ["03", "Jugá y ganá", "Se juega en la cancha. El premio lo pone quien arma el desafío."],
];

export default function HomePage() {
  const hayTiendas = Boolean(appStoreUrl || playStoreUrl);

  return (
    <SiteShell>
      <div className="mt-2 flex justify-center">
        <BrandLogo size="hero" />
      </div>
      <p className="font-display mt-3 text-center text-3xl leading-none text-plc-sky">Y algo más</p>
      <h1 className="font-display mt-5 text-[3.25rem] leading-[0.9] text-plc-white">
        El partido
        <br />
        es por algo.
      </h1>
      <p className="mt-5 text-[15px] leading-6 text-plc-text-secondary">
        Fútbol amateur con premio. No es una reserva de cancha: es un desafío. Armás tu equipo, te
        inscribís y jugás. Esta web sirve para las tiendas, los enlaces de WhatsApp y los trámites
        de cuenta. El juego está en la app.
      </p>

      <StoreButtons className="mt-7" />
      {!hayTiendas ? (
        <p className="card-plc mt-6 border border-white/10 px-4 py-3 text-sm leading-5 text-plc-text-secondary">
          Las tiendas todavía no están publicadas. Cuando App Store y Play tengan link, acá aparecen
          los botones de descarga.
        </p>
      ) : null}

      <h2 className="font-display mt-12 text-3xl text-plc-gold">Cómo funciona</h2>
      <ol className="mt-4 space-y-3">
        {pasos.map(([n, t, d]) => (
          <li key={n} className="card-plc flex gap-3 p-4">
            <span className="font-display text-3xl leading-none text-plc-sky">{n}</span>
            <div>
              <p className="font-extrabold text-plc-white">{t}</p>
              <p className="mt-1 text-sm leading-5 text-plc-text-secondary">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </SiteShell>
  );
}
