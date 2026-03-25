"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function EquipoRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  useEffect(() => {
    router.replace(`/jugador/equipos/${id}`);
  }, [id, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-[#1A2E4A]/70">Redirigiendo al equipo...</p>
    </div>
  );
}
