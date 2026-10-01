import { appStoreUrl, playStoreUrl } from "@/lib/site";

export function StoreButtons({ className = "" }: { className?: string }) {
  if (!appStoreUrl && !playStoreUrl) return null;
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {appStoreUrl ? (
        <a href={appStoreUrl} className="btn-gold">
          Descargar en App Store
        </a>
      ) : null}
      {playStoreUrl ? (
        <a href={playStoreUrl} className="btn-sky">
          Descargar en Google Play
        </a>
      ) : null}
    </div>
  );
}
