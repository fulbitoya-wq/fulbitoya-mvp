"use client";

import { useEffect, useRef } from "react";
import { loadGoogleMaps } from "@/lib/google-maps";

interface AddressPreviewMapProps {
  lat: number;
  lng: number;
}

export function AddressPreviewMap({ lat, lng }: AddressPreviewMapProps) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMaps();
      } catch {
        return;
      }
      if (cancelled || !elRef.current) return;

      const center = new google.maps.LatLng(lat, lng);
      if (!mapRef.current) {
        mapRef.current = new google.maps.Map(elRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
        });
        markerRef.current = new google.maps.Marker({
          map: mapRef.current,
          position: center,
        });
        return;
      }

      mapRef.current.panTo(center);
      mapRef.current.setZoom(15);
      markerRef.current?.setPosition(center);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) return null;

  return <div ref={elRef} className="mt-2 h-40 w-full overflow-hidden rounded-lg border border-[#E0E0E0]" />;
}
