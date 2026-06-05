/**
 * Optimize Supabase Storage image URLs using built-in image transforms.
 * Passes through non-Supabase URLs unchanged.
 *
 * Supabase storage transform docs: ?width=&height=&quality=&resize=
 * Works on URLs containing "/storage/v1/object/public/" by rewriting to
 * "/storage/v1/render/image/public/" with query params.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  opts: { width?: number; height?: number; quality?: number; resize?: "cover" | "contain" | "fill" } = {}
): string {
  if (!url) return "";
  // Only transform Supabase storage public URLs
  if (!url.includes("/storage/v1/object/public/")) return url;

  const transformed = url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
  const params = new URLSearchParams();
  if (opts.width) params.set("width", String(opts.width));
  if (opts.height) params.set("height", String(opts.height));
  if (opts.quality) params.set("quality", String(opts.quality));
  // Default to `contain` when no explicit resize/height is set — Supabase otherwise
  // defaults to `cover`, which hard-crops portrait/landscape photos into the width box.
  const resize = opts.resize ?? (opts.height ? undefined : "contain");
  if (resize) params.set("resize", resize);
  const qs = params.toString();
  return qs ? `${transformed}?${qs}` : transformed;
}
