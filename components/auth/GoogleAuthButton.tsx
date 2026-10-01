"use client";

import { isGoogleAuthEnabled, signInWithGoogle } from "@/lib/auth/google";

export function GoogleAuthButton({ label }: { label: string }) {
  if (!isGoogleAuthEnabled()) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        const { error } = await signInWithGoogle();
        if (error) {
          window.alert(error.message);
        }
      }}
      className="w-full rounded-lg border border-[#E0E0E0] bg-white py-3 text-sm font-medium text-[#1A2E4A] transition hover:bg-[#F5F5F5]"
    >
      {label}
    </button>
  );
}
