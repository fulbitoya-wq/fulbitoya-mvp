"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  actualizarCanchaDelOwner,
  getCanchaDelOwnerById,
  type Cancha,
} from "@/lib/canchas";
import { supabase } from "@/lib/supabase";

const BUCKET_LOGOS = "predio-logos";
const BUCKET_FONDOS = "predio-fondos";
const MAX_LOGO_FILE_MB = 2;
const MAX_FONDO_FILE_MB = 4;

export default function EditarCanchaPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const canchaId = params?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cancha, setCancha] = useState<Cancha | null>(null);
  const [nombre, setNombre] = useState("");
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [fondoPreview, setFondoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [fondoFile, setFondoFile] = useState<File | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const fondoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      if (!canchaId) return;
      setLoading(true);
      setError(null);

      const row = await getCanchaDelOwnerById(canchaId);
      if (!row) {
        setError("No encontramos la cancha o no tenés permisos.");
        setLoading(false);
        return;
      }

      setCancha(row);
      setNombre(row.nombre ?? "");
      setLogoPreview(row.logo_url ?? null);
      setFondoPreview(row.fondo_url ?? null);
      setLoading(false);
    };

    load();
  }, [canchaId]);

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_LOGO_FILE_MB * 1024 * 1024) {
      setError(`El logo no puede superar ${MAX_LOGO_FILE_MB} MB.`);
      return;
    }
    setError(null);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const onFondoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FONDO_FILE_MB * 1024 * 1024) {
      setError(`La imagen de fondo no puede superar ${MAX_FONDO_FILE_MB} MB.`);
      return;
    }
    setError(null);
    setFondoFile(file);
    setFondoPreview(URL.createObjectURL(file));
  };

  const uploadPublicImage = async (
    bucket: string,
    file: File,
    userId: string
  ): Promise<{ publicUrl: string | null; error: string | null }> => {
    const path = `${userId}/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });
    if (error) return { publicUrl: null, error: error.message };
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
    return { publicUrl: urlData.publicUrl, error: null };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canchaId || !cancha) return;

    setSaving(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      setError("Debés estar logueado.");
      return;
    }

    let nextLogoUrl: string | null | undefined = cancha.logo_url ?? null;
    let nextFondoUrl: string | null | undefined = cancha.fondo_url ?? null;

    if (logoFile) {
      const { publicUrl, error: uploadErr } = await uploadPublicImage(
        BUCKET_LOGOS,
        logoFile,
        user.id
      );
      if (uploadErr) {
        setSaving(false);
        setError(uploadErr);
        return;
      }
      nextLogoUrl = publicUrl;
    }

    if (fondoFile) {
      const { publicUrl, error: uploadErr } = await uploadPublicImage(
        BUCKET_FONDOS,
        fondoFile,
        user.id
      );
      if (uploadErr) {
        setSaving(false);
        setError(uploadErr);
        return;
      }
      nextFondoUrl = publicUrl;
    }

    const { ok, error: updErr } = await actualizarCanchaDelOwner(canchaId, {
      nombre: nombre.trim() || cancha.nombre,
      logo_url: nextLogoUrl ?? null,
      fondo_url: nextFondoUrl ?? null,
    });

    setSaving(false);
    if (!ok) {
      setError(updErr ?? "No se pudo actualizar.");
      return;
    }

    router.push("/dashboard/canchas");
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-[#1A2E4A]/70">Cargando cancha...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href="/dashboard/canchas"
        className="text-sm font-medium text-[#1A2E4A]/70 hover:underline"
      >
        ← Volver a mis canchas
      </Link>

      <h1 className="mt-4 font-heading text-3xl uppercase tracking-wide text-[#1A2E4A]">
        Editar predio
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-xl border border-[#E0E0E0] bg-white p-6 shadow-sm"
      >
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Nombre del predio
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="mt-1 w-full rounded-lg border border-[#E0E0E0] px-4 py-2"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Logo del predio
          </label>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onLogoChange}
            className="mt-2 block w-full text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
          />
          {logoPreview && (
            <div className="mt-2 relative h-16 w-16 overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoPreview} alt="Vista previa logo" className="h-full w-full object-contain" />
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-[#1A2E4A]">
            Fondo del predio
          </label>
          <input
            ref={fondoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={onFondoChange}
            className="mt-2 block w-full text-sm text-[#1A2E4A] file:mr-2 file:rounded-lg file:border-0 file:bg-[var(--fulbito-green)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white file:hover:bg-[var(--fulbito-green-hover)]"
          />
          {fondoPreview && (
            <div className="mt-2 relative h-28 w-full overflow-hidden rounded-lg border border-[#E0E0E0] bg-[#F5F5F5]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={fondoPreview} alt="Vista previa fondo" className="h-full w-full object-cover" />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--fulbito-green)] px-4 py-2 font-medium text-white transition hover:bg-[var(--fulbito-green-hover)] disabled:opacity-70"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href="/dashboard/canchas"
            className="rounded-lg border border-[#E0E0E0] px-4 py-2 font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
