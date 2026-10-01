export function webBaseUrl(): string {
  return (process.env.EXPO_PUBLIC_WEB_URL ?? "").replace(/\/$/, "");
}

export function emailRedirectConfirm(): string {
  const web = webBaseUrl();
  return web ? `${web}/auth/confirmado` : "porlacancha://auth/callback";
}

export function emailRedirectReset(): string {
  const web = webBaseUrl();
  return web ? `${web}/auth/reset` : "porlacancha://auth/callback";
}
