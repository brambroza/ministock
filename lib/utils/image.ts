export function normalizeImageUrl(input?: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  const pub = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";

  if (raw.startsWith("product-images/")) {
    return pub ? `${pub}/storage/v1/object/public/${raw}` : null;
  }

  if (raw.startsWith("/storage/v1/object/public/")) {
    return pub ? `${pub}${raw}` : raw;
  }

  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (raw.startsWith("http://")) {
    // LINE browser blocks mixed content; force https when possible
    return raw.replace(/^http:\/\//i, "https://");
  }

  return raw;
}
