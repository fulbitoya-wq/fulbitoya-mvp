"use client";

import Link from "next/link";

type SuccessModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  primaryAction?: { label: string; href: string };
};

export function SuccessModal({
  open,
  onClose,
  title,
  message,
  primaryAction = { label: "Ir a ingresar", href: "/login" },
}: SuccessModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="success-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-[#1A2E4A]/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm rounded-2xl border border-[#E0E0E0] bg-white p-8 shadow-xl">
        {/* Icon */}
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#4CAF50]/15 text-[#4CAF50]">
          <svg
            className="h-9 w-9"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>

        <h2
          id="success-modal-title"
          className="mt-4 text-center font-heading text-xl font-semibold uppercase tracking-wide text-[#1A2E4A]"
        >
          {title}
        </h2>
        <p className="mt-2 text-center text-sm text-[#1A2E4A]/80">{message}</p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={primaryAction.href}
            className="block w-full rounded-lg bg-[#4CAF50] py-3 text-center font-medium text-white transition hover:bg-[#388E3C]"
          >
            {primaryAction.label}
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-[#E0E0E0] py-3 font-medium text-[#1A2E4A]/70 transition hover:bg-[#F5F5F5]"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
