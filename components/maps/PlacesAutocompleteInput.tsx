"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

export interface PlaceSelection {
  formattedAddress: string;
  lat: number;
  lng: number;
  placeId: string | null;
  barrio: string | null;
}

interface PlacesAutocompleteInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onPlaceSelected: (place: PlaceSelection) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
}

type AddressPiece = { longText?: string; long_name?: string; types: string[] };

function barrioFromComponents(components: AddressPiece[] | undefined): string | null {
  if (!components) return null;
  const subtype =
    components.find((c) => c.types.includes("neighborhood")) ||
    components.find((c) => c.types.includes("sublocality_level_1")) ||
    components.find((c) => c.types.includes("locality"));
  return subtype?.longText ?? subtype?.long_name ?? null;
}

type PlaceAutocompleteEl = HTMLElement & { value?: string };

export function PlacesAutocompleteInput({
  id,
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Buscá una dirección...",
  required,
  className,
}: PlacesAutocompleteInputProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<PlaceAutocompleteEl | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  const onChangeRef = useRef(onChange);
  onPlaceSelectedRef.current = onPlaceSelected;
  onChangeRef.current = onChange;
  const mapsErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        await loadGoogleMaps();
        const mapsNs = google.maps as typeof google.maps & {
          importLibrary?: (name: string) => Promise<{ PlaceAutocompleteElement: new (opts?: Record<string, unknown>) => PlaceAutocompleteEl }>;
        };
        if (!mapsNs.importLibrary) {
          throw new Error("Este navegador no carga Places API (New). Probá recargar.");
        }
        const places = await mapsNs.importLibrary("places");
        if (cancelled || !hostRef.current || widgetRef.current) return;
        if (!places.PlaceAutocompleteElement) {
          throw new Error("Falta Places API (New) en la key de Google.");
        }
        const el = new places.PlaceAutocompleteElement({
          includedRegionCodes: ["ar"],
          placeholder,
        });
        if (id) el.id = id;
        el.style.display = "block";
        el.style.width = "100%";
        hostRef.current.replaceChildren(el);
        widgetRef.current = el;
        if (value) el.value = value;

        el.addEventListener("gmp-select", (ev: Event) => {
          void (async () => {
            const pred = (ev as Event & { placePrediction?: { toPlace: () => PlaceNew } }).placePrediction;
            if (!pred) return;
            const place = pred.toPlace();
            await place.fetchFields({ fields: ["formattedAddress", "location", "id", "addressComponents"] });
            const loc = place.location;
            if (!loc) return;
            const address = place.formattedAddress || el.value || "";
            onChangeRef.current(address);
            onPlaceSelectedRef.current({
              formattedAddress: address,
              lat: loc.lat(),
              lng: loc.lng(),
              placeId: place.id ?? null,
              barrio: barrioFromComponents(place.addressComponents),
            });
          })();
        });
        el.addEventListener("input", () => {
          onChangeRef.current(el.value ?? "");
        });
      } catch (err) {
        if (!cancelled && mapsErrorRef.current) {
          mapsErrorRef.current.textContent =
            err instanceof Error ? err.message : "No se pudo cargar Google Maps.";
        }
      }
    };

    void setup();
    return () => {
      cancelled = true;
      widgetRef.current?.remove();
      widgetRef.current = null;
    };
  }, [id, placeholder]);

  useEffect(() => {
    if (widgetRef.current && value && widgetRef.current.value !== value) {
      widgetRef.current.value = value;
    }
  }, [value]);

  return (
    <div>
      <div
        ref={hostRef}
        className={
          className ??
          "mt-1 w-full overflow-hidden rounded-lg border border-[#E0E0E0] bg-white [&_gmp-place-autocomplete]:block [&_gmp-place-autocomplete]:w-full"
        }
      />
      {required ? <input type="hidden" value={value} required readOnly /> : null}
      <p ref={mapsErrorRef} className="mt-1 text-xs text-red-700" />
    </div>
  );
}

type PlaceNew = {
  fetchFields: (opts: { fields: string[] }) => Promise<void>;
  location?: { lat: () => number; lng: () => number } | null;
  formattedAddress?: string;
  id?: string;
  addressComponents?: AddressPiece[];
};
