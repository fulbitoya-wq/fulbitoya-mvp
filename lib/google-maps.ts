const SCRIPT_ID = "google-maps-js";

export function getGoogleMapsApiKey(): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  return key ? key : null;
}

export function loadGoogleMaps(): Promise<typeof google> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps solo corre en el navegador."));
  }

  const existing = window.google?.maps;
  if (existing?.places && existing.Map) {
    return Promise.resolve(window.google);
  }

  const key = getGoogleMapsApiKey();
  if (!key) {
    return Promise.reject(new Error("Falta NEXT_PUBLIC_GOOGLE_MAPS_API_KEY en .env.local."));
  }

  const pending = (window as unknown as { __gmapsLoader?: Promise<typeof google> }).__gmapsLoader;
  if (pending) return pending;

  const loader = new Promise<typeof google>((resolve, reject) => {
    const prev = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (prev) {
      prev.addEventListener("load", () => resolve(window.google));
      prev.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps.")));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&libraries=places&language=es&region=AR`;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error("No se pudo cargar Google Maps."));
    document.head.appendChild(script);
  });

  (window as unknown as { __gmapsLoader?: Promise<typeof google> }).__gmapsLoader = loader;
  return loader;
}

export function formatPremioArs(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPremioPin(value: number): string {
  return `$${Math.round(value).toLocaleString("es-AR")}`;
}

export const MATCH_TIPO_LABEL: Record<string, string> = {
  f5: "Fútbol 5",
  f7: "Fútbol 7",
  f9: "Fútbol 9",
  f11: "Fútbol 11",
};
