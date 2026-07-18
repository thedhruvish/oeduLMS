export const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  // Strip control characters and block unsafe protocols like javascript:, vbscript:, and data:
  if (/^(?:javascript|vbscript|data):/i.test(trimmed)) {
    return "about:blank";
  }
  return trimmed;
}
