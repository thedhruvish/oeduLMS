export const CACHE_KEYS = {
  USER_SESSION: (token: string) => `user_session:${token}`,
  PUBLIC_SITE_THEME: "public_site_theme",
} as const;
