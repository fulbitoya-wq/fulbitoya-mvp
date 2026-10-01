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

function barrioFromComponents(
  components: Array<{ long_name: string; types: string[] }> | undefined
): string | null {
  if (!components) return null;
  const subtype =
    components.find((c) => c.types.includes("neighborhood")) ||
    components.find((c) => c.types.includes("sublocality_level_1")) ||
    components.find((c) => c.types.includes("locality"));
  return subtype?.long_name ?? null;
}

export function PlacesAutocompleteInput({
  id,
  value,
  onChange,
  onPlaceSelected,
  placeholder = "Buscá una dirección...",
  required,
  className,
}: PlacesAutocompleteInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);
  const onPlaceSelectedRef = useRef(onPlaceSelected);
  onPlaceSelectedRef.current = onPlaceSelected;
  const mapsErrorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    let cancelled = false;

    const setup = async () => {
      try {
        await loadGoogleMaps();
      } catch (err) {
        if (!cancelled && mapsErrorRef.current) {
          mapsErrorRef.current.textContent =
            err instanceof Error ? err.message : "No se pudo cargar Google Maps.";
        }
        return;
      }
      if (cancelled || !inputRef.current || acRef.current) return;

      const ac = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: "ar" },
        fields: ["formatted_address", "geometry", "place_id", "address_components", "name"],
      });
      acRef.current = ac;

      ac.addListener("place_changed", () => {
        const place = ac.getPlace();
        const loc = place.geometry?.location;
        if (!loc) return;
        onPlaceSelectedRef.current({
          formattedAddress: place.formatted_address || inputRef.current?.value || "",
          lat: loc.lat(),
          lng: loc.lng(),
          placeId: place.place_id ?? null,
          barrio: barrioFromComponents(place.address_components),
        });
      });
    };

    setup();

    return () => {
      cancelled = true;
      if (acRef.current) {
        google.maps.event.clearInstanceListeners(acRef.current);
        acRef.current = null;
      }
    };
  }, []);

  return (
    <div>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        required={required}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={
          className ??
          "mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2 focus:border-[var(--fulbito-green)] focus:outline-none focus:ring-1 focus:ring-[var(--fulbito-green)]"
        }
      />
      <p ref={mapsErrorRef} className="mt-1 text-xs text-red-700" />
    </div>
  );
}
