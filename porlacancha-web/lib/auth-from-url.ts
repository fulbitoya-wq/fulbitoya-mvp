import type { EmailOtpType, SupabaseClient } from "@supabase/supabase-js";

const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

function asOtpType(raw: string | null): EmailOtpType | null {
  if (!raw) return null;
  return OTP_TYPES.includes(raw as EmailOtpType) ? (raw as EmailOtpType) : null;
}

/** Completa la sesión desde el link de mail de Supabase (PKCE, token_hash o hash legacy). */
export async function completeAuthFromUrl(supabase: SupabaseClient): Promise<{
  ok: boolean;
  type: string | null;
  error: string | null;
}> {
  const url = new URL(window.location.href);
  const type = url.searchParams.get("type");
  const code = url.searchParams.get("code");
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { ok: !error, type, error: error?.message ?? null };
  }

  const tokenHash = url.searchParams.get("token_hash");
  const otpType = asOtpType(type) ?? asOtpType(url.searchParams.get("otp_type"));
  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    return { ok: !error, type: otpType, error: error?.message ?? null };
  }

  const hash = window.location.hash.replace(/^#/, "");
  if (hash) {
    const hp = new URLSearchParams(hash);
    const access_token = hp.get("access_token");
    const refresh_token = hp.get("refresh_token");
    const hashType = hp.get("type");
    if (access_token && refresh_token) {
      const { error } = await supabase.auth.setSession({ access_token, refresh_token });
      return { ok: !error, type: hashType ?? type, error: error?.message ?? null };
    }
  }

  const { data } = await supabase.auth.getSession();
  return { ok: Boolean(data.session), type, error: data.session ? null : null };
}
