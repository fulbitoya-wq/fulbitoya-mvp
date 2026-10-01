export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "soporte@porlacancha.com";

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://porlacancha.com").replace(
  /\/$/,
  ""
);

export const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.trim() || "";
export const playStoreUrl = process.env.NEXT_PUBLIC_PLAY_STORE_URL?.trim() || "";
export const appScheme = process.env.NEXT_PUBLIC_APP_SCHEME?.trim() || "porlacancha";

export function appDeepLink(path: string): string {
  const clean = path.replace(/^\//, "");
  return `${appScheme}://${clean}`;
}
