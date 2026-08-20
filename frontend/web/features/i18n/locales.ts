export const DEFAULT_LOCALE = "vi";

export const SUPPORTED_LOCALES = ["en", "vi"] as const;

export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export function isAppLocale(locale: string | null | undefined): locale is AppLocale {
  return SUPPORTED_LOCALES.includes(locale as AppLocale);
}
