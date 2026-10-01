"use client";

import { useEffect, useState } from "react";
import { appDeepLink } from "@/lib/site";
import { StoreButtons } from "./StoreButtons";

export function OpenInApp({ path, label }: { path: string; label: string }) {
  const [showStores, setShowStores] = useState(false);
  const href = appDeepLink(path);

  useEffect(() => {
    const t = window.setTimeout(() => setShowStores(true), 1800);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div className="mt-6 space-y-3">
      <a
        href={href}
        className="btn-gold"
        onClick={() => setShowStores(true)}
      >
        {label}
      </a>
      {showStores ? (
        <div>
          <p className="mb-2 text-center text-sm text-plc-text-secondary">
            Si no se abrió la app, instalala y volvé a este enlace.
          </p>
          <StoreButtons />
        </div>
      ) : null}
    </div>
  );
}
