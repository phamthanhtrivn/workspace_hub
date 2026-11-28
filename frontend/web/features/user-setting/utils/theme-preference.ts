import { UserTheme } from "../types/settings.enums";

export const THEME_STORAGE_KEY = "workspacehub-theme";

export function isUserTheme(theme: unknown): theme is UserTheme {
  return theme === UserTheme.LIGHT || theme === UserTheme.DARK;
}

/** Never apply a response belonging to an account that has since signed out. */
export function canApplyAccountTheme(
  requestUserId: string | null,
  activeUserId: string | null,
  theme: unknown,
): theme is UserTheme {
  return !!requestUserId && requestUserId === activeUserId && isUserTheme(theme);
}
