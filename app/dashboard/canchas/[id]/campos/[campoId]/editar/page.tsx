"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { actualizarCampo, getCamposByCancha, type Campo } from "@/lib/campos";
import { PoliticaReservasForm, type PoliticaReservasFormHandle } from "@/components/dashboard/PoliticaReservasForm";
import { validarPrecioYSena } from "@/lib/politica";

export default function EditarCampoPage() {
  const params = useParams<{ id: string; campoId: string }>();
  const canchaId = params.id;
  const campoId = params.campoId;
  const router = useRouter();
  const politicaRef = useRef<PoliticaReservasFormHandle>(null);

  const [campo, setCampo] = useState<Campo | null>(null);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState("5");
  const [superficie, setSuperficie] = useState("cesped_sintetico");
  const [valorHora, setValorHora] = useState("");
  const [valorReserva, setValorReserva] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!canchaId || !campoId) return;
      const rows = await getCamposByCancha(canchaId);
      const row = rows.find((c) => c.id === campoId) ?? null;
      if (!row) {
        setError("No encontramos ese campo.");
        setLoading(false);
        return;
      }
      setCampo(row);
      setNombre(row.nombre);
      setTipo(row.tipo ?? "5");
      setSuperficie(row.superficie ?? "cesped_sintetico");
      setValorHora(row.valor_hora != null && Number(row.valor_hora) > 0 ? String(row.valor_hora) : "");
      setValorReserva(row.valor_reserva != null && Number(row.valor_reserva) > 0 ? String(row.valor_reserva) : "");
      setLoading(false);
    };
    load();
  }, [canchaId, campoId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campoId || !canchaId) return;
    setSaving(true);
    setError(null);
    const precioNum = Number(valorHora);
    const senaNum = Number(valorReserva);
    const montoErr = validarPrecioYSena(precioNum, senaNum);
    if (montoErr) {
      setError(montoErr);
      setSaving(false);
      return;
    }
    const { ok, error: updErr } = await actualizarCampo(campoId, {
      nombre: nombre.trim() || "Campo",
      tipo,
      superficie,
      valor_hora: precioNum,
      valor_reserva: senaNum,
    });
    if (!ok) {
      setError(updErr);
      setSaving(false);
      return;
    }
    const pol = await politicaRef.current?.save(canchaId, campoId);
    setSaving(false);
    if (pol && !pol.ok) {
      setError(pol.error ?? "Se actualizó el campo, pero no la política.");
      return;
    }
    router.push(`/dashboard/canchas/${canchaId}/campos`);
  };

  if (loading) {
    return <p className="p-8 text-[#1A2E4A]/70">Cargando campo...</p>;
  }

  return (
    <div className="mx-auto max-w-3xl p-8">
      <Link href={`/dashboard/canchas/${canchaId}/campos`} className="text-sm font-medium text-[#1A2E4A]/70 hover:underline">
        ← Volver a campos
      </Link>
      <h1 className="mt-4 font-subheading text-2xl font-semibold text-[#1A2E4A]">Editar campo</h1>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm">
        {error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">Nombre</label>
          <input className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" value={nombre} onChange={(e) => setNombre(e.target.value)} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]">Tipo</label>
            <select className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="5">Fútbol 5</option>
              <option value="7">Fútbol 7</option>
              <option value="9">Fútbol 9</option>
              <option value="11">Fútbol 11</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]">Superficie</label>
            <select className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" value={superficie} onChange={(e) => setSuperficie(e.target.value)}>
              <option value="cesped_natural">Césped natural</option>
              <option value="cesped_sintetico">Césped sintético</option>
              <option value="tierra">Tierra</option>
              <option value="cemento">Cemento</option>
            </select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]">Precio de la cancha (ARS) *</label>
            <input className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" type="number" min={1} required value={valorHora} onChange={(e) => setValorHora(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1A2E4A]">Seña base (ARS) *</label>
            <input className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2" type="number" min={1} required value={valorReserva} onChange={(e) => setValorReserva(e.target.value)} />
          </div>
        </div>
        {canchaId && campo && (
          <PoliticaReservasForm
            ref={politicaRef}
            canchaId={canchaId}
            campoId={campoId}
            valorHora={valorHora}
            valorReserva={valorReserva}
            formato={tipo}
            showSaveButton={false}
          />
        )}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white disabled:opacity-70">
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <Link href={`/dashboard/canchas/${canchaId}/campos`} className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A]">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
