"use client";

import { useEffect, useRef, useState } from "react";
import { formatPremioPin, loadGoogleMaps } from "@/lib/google-maps";

export interface MapDesafioPin {
  id: string;
  lat: number;
  lng: number;
  premio: number;
  titulo: string;
}

interface DesafiosPriceMapProps {
  items: MapDesafioPin[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

type PriceOverlay = google.maps.OverlayView & {
  id: string;
  setSelected: (selected: boolean) => void;
};

function buildOverlayClass(): new (
  item: MapDesafioPin,
  map: google.maps.Map,
  selected: boolean,
  onSelect: (id: string) => void
) => PriceOverlay {
  class Overlay extends google.maps.OverlayView {
    id: string;
    private item: MapDesafioPin;
    private div: HTMLButtonElement | null = null;
    private selected: boolean;
    private onSelect: (id: string) => void;

    constructor(
      item: MapDesafioPin,
      map: google.maps.Map,
      selected: boolean,
      onSelect: (id: string) => void
    ) {
      super();
      this.id = item.id;
      this.item = item;
      this.selected = selected;
      this.onSelect = onSelect;
      this.setMap(map);
    }

    onAdd() {
      const div = document.createElement("button");
      div.type = "button";
      div.style.position = "absolute";
      div.style.transform = "translate(-50%, -100%)";
      div.style.border = "none";
      div.style.cursor = "pointer";
      div.style.padding = "6px 10px";
      div.style.borderRadius = "999px";
      div.style.fontWeight = "700";
      div.style.fontSize = "13px";
      div.style.boxShadow = "0 8px 18px rgba(26,46,74,0.18)";
      div.style.whiteSpace = "nowrap";
      div.textContent = formatPremioPin(Number(this.item.premio));
      div.addEventListener("click", (e) => {
        e.stopPropagation();
        this.onSelect(this.item.id);
      });
      this.div = div;
      this.applyStyle();
      this.getPanes()?.overlayMouseTarget.appendChild(div);
    }

    draw() {
      if (!this.div) return;
      const point = this.getProjection().fromLatLngToDivPixel(
        new google.maps.LatLng(this.item.lat, this.item.lng)
      );
      if (!point) return;
      this.div.style.left = `${point.x}px`;
      this.div.style.top = `${point.y - 6}px`;
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }

    setSelected(selected: boolean) {
      this.selected = selected;
      this.applyStyle();
    }

    private applyStyle() {
      if (!this.div) return;
      if (this.selected) {
        this.div.style.background = "var(--fulbito-navy, #1A2E4A)";
        this.div.style.color = "#fff";
        this.div.style.zIndex = "20";
        this.div.style.transform = "translate(-50%, -100%) scale(1.08)";
      } else {
        this.div.style.background = "#fff";
        this.div.style.color = "#1A2E4A";
        this.div.style.zIndex = "1";
        this.div.style.transform = "translate(-50%, -100%)";
      }
    }
  }

  return Overlay as unknown as new (
    item: MapDesafioPin,
    map: google.maps.Map,
    selected: boolean,
    onSelect: (id: string) => void
  ) => PriceOverlay;
}

export function DesafiosPriceMap({ items, selectedId, onSelect }: DesafiosPriceMapProps) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<PriceOverlay[]>([]);
  const OverlayClassRef = useRef<ReturnType<typeof buildOverlayClass> | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMaps();
      } catch {
        return;
      }
      if (cancelled || !mapEl.current || mapRef.current) return;

      OverlayClassRef.current = buildOverlayClass();
      mapRef.current = new google.maps.Map(mapEl.current, {
        center: { lat: -34.6037, lng: -58.3816 },
        zoom: 11,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        clickableIcons: false,
      });
      setMapReady(true);
    };

    init();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const OverlayClass = OverlayClassRef.current;
    if (!map || !OverlayClass) return;

    overlaysRef.current.forEach((o) => o.setMap(null));
    overlaysRef.current = items.map(
      (item) => new OverlayClass(item, map, item.id === selectedId, (id) => onSelectRef.current(id))
    );

    if (items.length) {
      const bounds = new google.maps.LatLngBounds();
      items.forEach((item) => bounds.extend({ lat: item.lat, lng: item.lng }));
      if (!bounds.isEmpty()) map.fitBounds(bounds, 64);
    }
  }, [items, mapReady]);

  useEffect(() => {
    overlaysRef.current.forEach((o) => o.setSelected(o.id === selectedId));
    const selected = items.find((i) => i.id === selectedId);
    if (selected && mapRef.current) {
      mapRef.current.panTo({ lat: selected.lat, lng: selected.lng });
    }
  }, [items, selectedId]);

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-[#E0E0E0] bg-[#F5F5F5] p-6 text-sm text-[#1A2E4A]/70">
        Falta `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` para mostrar el mapa.
      </div>
    );
  }

  return <div ref={mapEl} className="h-full min-h-[420px] w-full overflow-hidden rounded-xl" />;
}
